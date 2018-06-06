import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
import * as censoController from './../controllers/censo';
import * as internacionesController from './../controllers/internacion';
import * as camasController from './../controllers/cama';
import { Auth } from './../../../auth/auth.class';
import { model as Prestacion } from '../schemas/prestacion';
import { model as cama } from '../../../core/tm/schemas/camas';
import * as camaRouter from '../../../core/tm/routes/cama';


let router = express.Router();

router.get('/internaciones/ultima/:idPaciente', function (req, res, next) {
    // buscamos la ultima interncion del paciente
    internacionesController.buscarUltimaInternacion(req.params.idPaciente, req.query.estado).then(
        internacion => {
            let salida = { ultimaInternacion: null, cama: null };
            if (internacion && internacion.length > 0) {
                let ultimaInternacion = internacion[0];
                // Ahora buscamos si se encuentra asociada la internacion a una cama
                camasController.buscarCamaInternacion(mongoose.Types.ObjectId(ultimaInternacion.id), 'ocupada').then(
                    camas => {
                        salida = { ultimaInternacion: ultimaInternacion, cama: null };
                        if (camas && camas.length > 0) {
                            salida.cama = camas[0];
                        }
                        res.json(salida);
                    }).catch(err => {
                        return next(err);
                    });
            } else {
                res.json(null);
            }
        }).catch(error => {
            return next(error);
        });
});

router.get('/internaciones/pases/:idInternacion', function (req, res, next) {
    // buscamos los estados de la cama por donde "estuvo la internacion"
    camasController.buscarPasesCamaXInternacion(mongoose.Types.ObjectId(req.params.idInternacion)).then(
        camas => {
            if (camas) {
                res.json(camas);
            } else {
                res.json(null);
            }
        }).catch(err => {
            return next(err);
        });
});



router.patch('/internaciones/desocuparCama/:idInternacion', function (req, res, next) {
    // buscamos el ultimo estado de la cama por donde "estuvo la internacion"
    camasController.camaXInternacion(mongoose.Types.ObjectId(req.params.idInternacion)).then(
        (unaCama: any) => {
            if (unaCama) {
                let ultimoEstado = unaCama.estados[unaCama.estados.length - 1];
                let dto = {
                    fecha: req.body.fecha,
                    estado: 'desocupada',
                    unidadOrganizativa: ultimoEstado.unidadOrganizativa ? ultimoEstado.unidadOrganizativa : null,
                    especialidades: ultimoEstado.especialidades ? ultimoEstado.especialidades : null,
                    esCensable: ultimoEstado.esCensable,
                    genero: ultimoEstado.genero ? ultimoEstado.genero : null,
                    paciente: null,
                    idInternacion: null
                };

                unaCama.estados.push(dto);
                Auth.audit(unaCama, req);
                // guardamos organizacion
                unaCama.save((errUpdate) => {
                    if (errUpdate) {
                        return next(errUpdate);
                    }
                    res.json(unaCama);
                });
            } else {
                res.json(null);
            }
        }).catch(err => {
            return next(err);
        });
});


router.get('/internaciones/censo', function (req, res, next) {
    let unidad = req.query.unidad;
    let idOrganizacion = mongoose.Types.ObjectId(Auth.getOrganization(req));
    let resultadoFinal;
    let fecha = new Date(req.query.fecha);
    censoController.censoDiario(unidad, fecha, idOrganizacion).then(censoDiario => {
        censoController.completarResumenDiario(censoDiario, unidad, fecha, idOrganizacion).then(resumen => {
            resultadoFinal = {
                censoDiario: censoDiario,
                resumen: resumen
            };
            res.json(resultadoFinal);
        }).catch(err => {
            return next(err);
        });
    }).catch(err => {
        return next(err);
    });
});

router.get('/internaciones/censoMensual', function (req, res, next) {
    let unidad = req.query.unidad;

    let idOrganizacion = mongoose.Types.ObjectId(Auth.getOrganization(req));
    let resultadoFinal;
    let censoMensual = [];

    censoController.censoMensual(req.query.fechaDesde, req.query.fechaHasta, unidad, idOrganizacion).then(result => {
        res.json(result);
    });
});

router.get('/internaciones/censo/disponibilidad', function (req, res, next) {
    // conceptId de la unidad organizativa
    let unidad = req.query.unidad; // '310022001';
    let fecha = new Date(req.query.fecha);
    let idOrganizacion = mongoose.Types.ObjectId(Auth.getOrganization(req));
    camasController.disponibilidadXUO(unidad, fecha, idOrganizacion).then(
        resultado => {
            if (resultado) {
                res.json(resultado);

            } else {
                res.json(null);
            }
        }).catch(err => {
            return next(err);
        });
});

export = router;
