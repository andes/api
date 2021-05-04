import { MongoQuery, ResourceBase } from '@andes/core';
import { Request } from '@andes/api-tool';
import { Auth } from '../../auth/auth.class';
import { InscripcionVacuna } from './schemas/inscripcion-vacunas.schema';
import { EventCore } from '@andes/event-bus/';
import { validar } from '../../core-v2/mpi/validacion';
import { matching } from '../../core-v2/mpi/paciente/paciente.controller';
import { mpi } from '../../config';
import { handleHttpRequest } from '../../utils/requestHandler';
import { captcha, userScheduler } from './../../config.private';
import { mensajeEstadoInscripcion, validarDomicilio, validarInscripcion } from './controller/inscripcion.vacunas.controller';
import { IInscripcionVacunas } from './interfaces/inscripcion-vacunas.interface';

class InscripcionVacunasResource extends ResourceBase {
    Model = InscripcionVacuna;
    resourceModule = 'vacunas';
    resourceName = 'inscripcion-vacunas';
    routesEnable = ['put', 'post'];
    middlewares = [Auth.authenticate()];
    searchFileds = {
        documento: MongoQuery.matchString,
        grupo: {
            field: 'grupo.nombre',
            fn: MongoQuery.equalMatch
        },
        localidad: {
            field: 'localidad._id',
            fn: MongoQuery.equalMatch,
        },
        nombre: MongoQuery.partialString,
        apellido: MongoQuery.partialString,
        tokens: MongoQuery.equalMatch,
        sexo: MongoQuery.equalMatch,
        idPaciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        },
        incluirVacunados: {
            field: 'fechaVacunacion',
            fn: (value) => {
                return { $exists: value };
            }
        },
        tieneCertificado: {
            field: 'idPrestacionCertificado',
            fn: (value) => {
                return { $exists: value };
            }
        },
        estado: MongoQuery.equalMatch,
        fechaRegistro: MongoQuery.matchDate.withField('fechaRegistro'),
        grupos: MongoQuery.inArray.withField('grupo.nombre'),
        validado: MongoQuery.equalMatch
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
        if (captcha.enabled) {
            const verificar = await validarToken(req.query.recaptcha);
            if (!verificar) {
                return next('Error recaptcha');
            }
        }
        if (doc && sexo) {
            const mensaje = await mensajeEstadoInscripcion(doc, sexo);
            return res.json(mensaje);
        }
        return next('Parámetros incorrectos');
    } catch (err) {
        return next(err);
    }
});

InscripcionVacunasRouter.get('/inscripcion-vacunas', Auth.authenticate(), async (req: Request, res, next) => {
    try {
        const options = req.apiOptions();
        let conditions = { ...req.query };
        Object.keys(options).map(opt => delete conditions[opt]);
        let inscriptos;
        if (conditions.paciente) {
            const tokensQuery = InscripcionVacuna.search(conditions.paciente);
            delete conditions.paciente;
            conditions.tokens = tokensQuery;
        }
        inscriptos = await InscripcionVacunasCtr.search(conditions, options, req);
        return res.json(inscriptos);
    } catch (err) {
        return next(err);
    }
});

InscripcionVacunasRouter.patch('/inscripcion-vacunas/:id', Auth.authenticate(), async (req: Request, res, next) => {
    try {
        let inscripto: IInscripcionVacunas = req.body;
        if (inscripto) {
            if (!inscripto.validaciones?.includes('domicilio')) {
                const domicilio = await validarDomicilio(inscripto);
                if (domicilio) {
                    inscripto.validaciones?.length ? inscripto.validaciones.push('domicilio') : inscripto.validaciones = ['domicilio'];
                }
            }
            if (!inscripto.validaciones?.includes('domicilio') || inscripto.validado === false) {
                const inscriptoValidado = await validar(inscripto.documento as any, inscripto.sexo as any);
                inscripto = await validarInscripcion(req.body, inscriptoValidado, req);
            }
            if (inscripto.estado === 'habilitado' && req.body.grupo.nombre === 'personal-salud') {
                inscripto.personal_salud = true;
            }
            const updated = await InscripcionVacunasCtr.update(inscripto.id, inscripto, req);
            return res.json(updated);
        } else {
            return next('No se encuentra la inscripción');
        }
    } catch (err) {
        return next(err);
    }
});

InscripcionVacunasRouter.post('/inscripcion-vacunas/registro', async (req: Request, res, next) => {
    try {
        const documento = req.body.documento;
        const sexo = req.body.sexo;
        req.body.nombre = req.body.nombre.toUpperCase();
        req.body.apellido = req.body.apellido.toUpperCase();

        // Verifica si se encuentra inscripto previamente
        const inscripto = await InscripcionVacunasCtr.findOne({ documento, sexo, validado: true });
        if (!inscripto) {
            req.body.validado = false;
            req.body.estado = 'pendiente';
            // Realiza la búsqueda en Renaper
            const inscriptoValidado = await validar(documento, sexo);
            if (inscriptoValidado) {
                // Realiza el match
                const value = await matching(inscriptoValidado, req.body);
                if (value < mpi.cotaMatchMax) {
                    const tramite = Number(req.body.nroTramite);
                    // Verifica el número de trámite sólo en caso que no matchee el paciente
                    if (req.body.tieneTramite && inscriptoValidado.idTramite !== tramite) {
                        return next('Número de Trámite inválido');
                    }
                    // Verifica el caso en que marca que no tiene numero de trámite pero si tiene
                    if (!req.body.tieneTramite && inscriptoValidado.idTramite) {
                        return next('Su documento registra un número de trámite, por favor verifique');
                    }
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

            const inscripcion = await InscripcionVacunasCtr.create(req.body, userScheduler as any);
            return res.json(inscripcion);
        } else {
            return next('Existe una inscripción registrada. Verifique su estado en la página de consultas.');
        }

    } catch (err) {
        return next(err);
    }

});
