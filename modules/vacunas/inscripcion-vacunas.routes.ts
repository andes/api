import { MongoQuery, ResourceBase } from '@andes/core';
import { Request, Response } from '@andes/api-tool';
import { Auth } from '../../auth/auth.class';
import { InscripcionVacuna } from './schemas/inscripcion-vacunas.schema';
import { EventCore } from '@andes/event-bus/';
import { validar } from '../../core-v2/mpi/validacion';
import { matching } from '../../core-v2/mpi/paciente/paciente.controller';
import { mpi } from '../../config';
import { handleHttpRequest } from '../../utils/requestHandler';
import { captcha } from './../../config.private';

class InscripcionVacunasResource extends ResourceBase {
    Model = InscripcionVacuna;
    resourceModule = 'vacunas';
    resourceName = 'inscripcion-vacunas';
    routesEnable = ['put'];
    middlewares = [Auth.authenticate()];
    searchFileds = {
        documento: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        apellido: MongoQuery.partialString,
        sexo: MongoQuery.equalMatch,
        idPaciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        }
    };
    eventBus = EventCore;
}

export const InscripcionVacunasCtr = new InscripcionVacunasResource({});
export const InscripcionVacunasRouter = InscripcionVacunasCtr.makeRoutes();

async function validarToken(token) {
    try {
        if (token === null || token === undefined) {
            return false;
        }
        const urlValidacion = `${captcha.url}?secret=${captcha.secret_key}&response=${token}`;
        const options = {
            uri: urlValidacion,
            method: 'POST',
            json: true,
        };
        const [status, body] = await handleHttpRequest(options);
        if (status === 200 && body.success) {
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
}

InscripcionVacunasRouter.get('/inscripcion-vacunas/consultas', async (req: Request, res, next) => {
    try {
        const doc = req.query.documento;
        const sexo = req.query.sexo;
        const verificar = await validarToken(req.query.recaptcha);
        if (!verificar) {
            return next('Error recaptcha');
        }
        if (doc && sexo) {
            const inscripto = await InscripcionVacunasCtr.findOne({
                documento: doc,
                sexo
            });
            return res.json(inscripto);
        }
        return next('Parámetros incorrectos');
    } catch (err) {
        return next(err);
    }
});

InscripcionVacunasRouter.get('/inscripcion-vacunas', Auth.authenticate(), async (req: Request, res, next) => {
    try {
        const options = req.apiOptions();
        const data = req.query;
        const inscriptos = await InscripcionVacunasCtr.search(data, options, req);
        return res.json(inscriptos);
    } catch (err) {
        return next(err);
    }
});

InscripcionVacunasRouter.post('/inscripcion-vacunas', async (req: Request, res, next) => {
    try {
        // Verifica el recaptcha
        if (captcha.enabled) {
            const verificar = await validarToken(req.body.recaptcha);
            if (!verificar) {
                return next('Error recaptcha');
            }
        }
        const documento = req.body.documento;
        const sexo = req.body.sexo;
        req.body.nombre = req.body.nombre.toUpperCase();
        req.body.apellido = req.body.apellido.toUpperCase();

        // Verifica si se encuentra inscripto previamente
        const inscripto = await InscripcionVacunasCtr.findOne({ documento, sexo });
        if (!inscripto) {
            req.body.validado = false;
            req.body.estado = 'pendiente';
            // Realiza la búsqueda en Renaper
            const inscriptoValidado = await validar(documento, sexo);
            if (inscriptoValidado) {
                const tramite = Number(req.body.nroTramite);
                // Verifica el número de trámite
                if (req.body.tieneTramite && inscriptoValidado.idTramite !== tramite) {
                    return next('Número de Trámite inválido');
                }
                // Verifica el caso en que marca que no tiene numero de trámite pero si tiene
                if (!req.body.tieneTramite && inscriptoValidado.idTramite) {
                    return next('Su documento registra un número de trámite, por favor verifique');
                }
                // Realiza el match
                const value = await matching(inscriptoValidado, req.body);
                if (value < mpi.cotaMatchMax) {
                    return next('Datos inválidos, verifique sus datos personales');
                }
                req.body.validado = true;
            } else {
                if (req.body.grupo.nombre !== 'mayores60') {
                    return next('No es posible verificar su identidad.  Por favor verifique sus datos');
                }
            }

            if (req.body.grupo.nombre === 'factores-riesgo' && !req.body.morbilidades[0]) {
                return next('Seleccionar factor de riesgo asociado a vacunación');
            }

            const inscripcion = await InscripcionVacunasCtr.create(req.body, req);
            EventCore.emitAsync('vacunas:inscripcion-vacunas:create', inscripcion, inscriptoValidado, req);
            return res.json(inscripcion);
        } else {
            return next('Existe una inscripción registrada');
        }

    } catch (err) {
        return next(err);
    }

});
