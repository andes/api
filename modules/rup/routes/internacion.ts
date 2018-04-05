import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
// import * as async from 'async';

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
    let fecha = new Date(req.query.fecha);
    camasController.camaOcupadasxUO(unidad, fecha).then(
        camas => {
            if (camas) {
                let salidaCamas = Promise.all(camas.map(c => camasController.desocupadaEnDia(c, fecha)))
                salidaCamas.then(salida => {
                    salida = salida.filter(s => s);
                    let pasesDeCama = Promise.all(salida.map(c => internacionesController.PasesParaCenso(c)));
                    pasesDeCama.then(resultado => {
                        let pasesCamaCenso: any[] = resultado;
                        let listadoCensos = [];
                        // loopeamos todos los pases de las camas
                        Promise.all(pasesCamaCenso.map((censo: any, indice) => {
                            censo.pases = censo.pases.filter(p => { return p.estados.fecha <= moment(fecha).endOf('day').toDate(); });
                            // Llamamos a la funcion completarUnCenso que se encarga de devolvernos un array
                            // con la informacion que necesitamos para el censo. (ingreso, pase de, pase a, etc)
                            let result = censoController.completarUnCenso(censo, indice, fecha, unidad, pasesCamaCenso[indice]);

                            let index = -2;
                            if (result['esIngreso'] && result['esPaseDe']) {
                                index = censo.pases.findIndex(p => p.estados._id === result['esPaseDe']._id);
                            }

                            if (!result['esIngreso'] && result['esPaseA'] && result['esPaseDe']) {
                                if (result['esPaseA'].fecha <= result['esPaseDe'].fecha) {
                                    index = censo.pases.findIndex(p => p.estados._id === result['esPaseA']._id);
                                }
                            }

                            if (index >= 0) {
                                let pases1 = censo.pases.slice(0, (index + 1));
                                let pases2 = censo.pases.slice(index, censo.pases.length);

                                censo.pases = pases1;
                                let nuevoCenso = Object.assign({}, censo);
                                nuevoCenso.pases = pases2;
                                let algo = censoController.completarUnCenso(censo, indice, fecha, unidad, pasesCamaCenso[indice]);
                                listadoCensos.push(algo);
                                let algo2 = censoController.completarUnCenso(nuevoCenso, indice, fecha, unidad, pasesCamaCenso[indice]);
                                listadoCensos.push(algo2);

                            } else {

                                listadoCensos.push(result);
                            }
                        })).then(r => {
                            res.json(listadoCensos)
                        }).catch(error => {
                            return next(error);
                        });

                    }).catch(error => {
                        return next(error);
                    });
                });
            } else {
                res.json(null);
            }
        }).catch(err => {
            return next(err);
        });
});

router.get('/internaciones/censo/disponibilidad', function (req, res, next) {
    // conceptId de la unidad organizativa
    let unidad = req.query.unidad;//'310022001';
    let fecha = new Date(req.query.fecha);

    camasController.disponibilidadXUO(unidad, fecha).then(
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
