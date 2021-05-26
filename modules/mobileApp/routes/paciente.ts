import * as express from 'express';
import * as cdaCtr from '../../cda/controller/CDAPatient';
import { xmlToJson } from '../../../utils/utils';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { validar } from '../../../core-v2/mpi/validacion';
import { findById, findOrCreate, extractFoto, agregarHijo } from '../../../core-v2/mpi/paciente/paciente.controller';
import { calcularEdad } from '../../../core-v2/mpi/paciente/paciente.schema';
const router = express.Router();

/**
 * Get paciente
 *
 * @param id {string} id del paciente
 * Chequea que el paciente este asociado a la cuenta
 */

router.get('/paciente/:id', async (req: any, res, next) => {
    const idPaciente = req.params.id;
    const pacientes = req.user.pacientes;
    const index = pacientes.findIndex(item => item.id === idPaciente);
    if (index >= 0) {
        const resultado: any = await findById(pacientes[index].id, { fields: '-claveBlocking -entidadesValidadoras -carpetaEfectores -createdBy' });
        if (resultado) {
            return res.json(resultado);
        }
        return res.status(422).send({ message: 'invalid_id' });
    } else {
        return res.status(422).send({ message: 'unauthorized' });
    }
});

router.get('/paciente/:id/relaciones', async (req: any, res, next) => {
    try {
        const paciente = await findById(req.params.id);
        if (!paciente) {
            return res.status(422).send({ message: 'Paciente no encontrado' });
        }
        const resultado = await findById(req.user.pacientes[0].id);
        // Verifico que el paciente sea familiar del usuario logueado
        const esFamiliar = (resultado.relaciones).find(rel => rel.documento === paciente.documento);
        if (esFamiliar) {
            return res.json(paciente);
        } else {
            return res.status(422).send({ message: 'unauthorized' });
        }
    } catch (err) {
        return next(err);
    }
});

router.get('/relaciones', async (req: any, res, next) => {
    try {
        const paciente: any = await findById(req.query.id);
        let arrayRelaciones = [];
        let pacienteRel;
        if (paciente.relaciones) {
            for (let rel of paciente.relaciones) {
                if (rel.relacion) {
                    let objRelacion = rel.toObject();
                    pacienteRel = await findById(rel.referencia as any);
                    pacienteRel = pacienteRel.toObject({ virtuals: true });
                    objRelacion.id = pacienteRel.id;
                    objRelacion.edad = pacienteRel.edad;
                    arrayRelaciones.push(objRelacion);
                }
            }
        }
        res.json(arrayRelaciones);
    } catch (err) {
        return next(err);
    }
});
/**
 * Modifica datos de contacto y otros
 *
 * @param id {string} id del paciente
 *
 */

router.put('/paciente/:id', async (req: any, res, next) => {
    const idPaciente = req.params.id;
    let paciente = await findById(idPaciente);
    const index = req.user.pacientes.findIndex(item => item.id === idPaciente);
    let esFamiliar;
    if (index < 0) {
        const resultado = await findById(req.user.pacientes[0].id);
        esFamiliar = resultado.relaciones.find(rel => {
            return rel.referencia.toString() === paciente.id.toString();
        });
    }
    if (index >= 0 || esFamiliar) {
        try {
            if (paciente) {
                await PacienteCtr.update(paciente.id, req.body, req);
                return res.send({ status: 'OK' });
            }
        } catch (error) {
            return next(error);
        }
    } else {
        return next({ message: 'unauthorized' });
    }
});

/**
 * Actualización de la dirección y la fotoMobile
 * [No esta en uso]
 */

router.patch('/pacientes/:id', async (req: any, res, next) => {
    const idPaciente = req.params.id;
    const pacientes = (req as any).user.pacientes;
    const index = pacientes.findIndex(item => item.id === idPaciente);

    if (index >= 0) {
        try {
            let paciente = await findById(req.params.id);
            if (paciente) {
                const updated = await PacienteCtr.update(paciente.id, req.body, req);
                return res.json(updated);
            }
        } catch (err) {
            return next(err);
        }
    }
});


/**
 * Devuelve los CDA de laboratorios de un paciente.
 */


router.get('/laboratorios/(:id)', async (req: any, res, next) => {
    const idPaciente = req.params.id;
    let paciente: any = await findById(idPaciente);
    const index = req.user.pacientes.findIndex(item => item.id === idPaciente);
    let esFamiliar;
    if (index < 0) {
        const resultado = await findById((req as any).user.pacientes[0].id);
        esFamiliar = resultado.relaciones.find(rel => {
            return rel.referencia.toString() === paciente.id.toString();
        });
    }
    if (index >= 0 || esFamiliar) {
        if (!paciente) {
            return next({ message: 'no existe el paciente' });
        }
        let limit = parseInt(req.query.limit || 10, 0);
        let skip = parseInt(req.query.skip || 0, 0);
        let cdas: any[] = await cdaCtr.searchByPatient(paciente.vinculos, '4241000179101', { limit, skip });
        for (let cda of cdas) {
            let _xml = await cdaCtr.loadCDA(cda.cda_id);
            let dom: any = xmlToJson(_xml);
            cda.confidentialityCode = dom.ClinicalDocument.confidentialityCode['@attributes'].code;
            cda.title = dom.ClinicalDocument.title['#text'];
            cda.organizacion = dom.ClinicalDocument.author.assignedAuthor.representedOrganization.name['#text'];
        }
        res.json(cdas);
    } else {
        return next({ message: 'unauthorized' });
    }
});


router.post('/registro-familiar/:id', async (req: any, res, next) => {
    try {
        const idPaciente = req.params.id;
        let pacienteActual: any = await findById(idPaciente);
        const index = req.user.pacientes.findIndex(item => item.id === idPaciente);
        if (index >= 0) {
            const documento = req.body.documento;
            const sexo = req.body.sexo;
            req.body.validado = false;
            req.body.estado = 'pendiente';
            // Realiza la búsqueda en Renaper
            const pacienteValidado = await validar(documento, sexo);
            if (pacienteValidado) {
                const tramite = Number(req.body.tramite);
                // Verifica el número de trámite
                if (pacienteValidado.idTramite !== tramite) {
                    return res.status(404).send('Número de trámite inválido');
                }
                req.body.nombre = pacienteValidado.nombre;
                req.body.apellido = pacienteValidado.apellido;
                req.body.fechaNacimiento = pacienteValidado.fechaNacimiento;
                req.body.validado = true;
                const edadFamiliar = calcularEdad(pacienteValidado.fechaNacimiento);
                if (edadFamiliar >= 11) {
                    return res.status(404).send('La edad del familiar a registrar no debe superar los 11 años');
                }
            } else {
                return res.status(404).send('No es posible verificar la identidad del familiar a registrar. Por favor verifique sus datos');
            }
            // Busca el paciente y si no existe lo guarda
            await extractFoto(pacienteValidado, req);
            const familiar = await findOrCreate(pacienteValidado, req);
            const pacienteUpdated = await agregarHijo(pacienteActual, familiar, req);
            if (pacienteUpdated) {
                return res.json(pacienteUpdated);
            } else {
                return res.status(404).send('El paciente ya se encuentra registrado dentro de sus familiares.');
            }
        } else {
            return next({ message: 'unauthorized' });
        }
    } catch (err) {
        return next(err);
    }
});


export = router;
