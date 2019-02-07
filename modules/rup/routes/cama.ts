import * as express from 'express';
import { model as CamaModel } from './../schemas/camas';
import { Auth } from '../../../auth/auth.class';
import * as mongoose from 'mongoose';
import * as camaController from './../controllers/cama';
import { parseDate } from './../../../shared/parse';

const router = express.Router();


/**
//  * busca las camas de una organizacion, por defecto trae todas o se
//  * pueden filtrar por estado o habitacion.
//  */

router.get('/camas', Auth.authenticate(), (req, res, next) => {

    let query;
    query = CamaModel.find({});
    if (req.query.idOrganizacion) {
        query.where('organizacion._id').equals(req.query.idOrganizacion);
    }
    // busqueda por el estado actual de la cama
    if (req.query.ultimoEstado) {
        query.where('ultimoEstado.estado').equals(req.query.ultimoEstado);
    }
    if (req.query.habitacion) {
        query.where('habitacion').equals(req.query.habitacion);
    }
    if (req.query.sectorId) {
        query.where('sectores._id').equals(req.query.sectorId);
    }
    if (req.query.unidadesOrganizativas) {
        query.where('estados.unidadOrganizativa.conceptId').equals(req.query.unidadesOrganizativas);
    }
    query.sort({ numero: 1, habitacion: 1 });
    query.exec({}, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


/**
 * trae las camas por fecha y hora.
 */

router.get('/camas/porfecha', Auth.authenticate(), (req, res, next) => {
    camaController.camasXfecha(new mongoose.Types.ObjectId(req.query.idOrganizacion), new Date(req.query.fecha)).then(
        camas => {
            res.json(camas);
        }).catch(error => {
            return next(error);
        });
});

router.get('/camas/historial', Auth.authenticate(), (req, res, next) => {
    camaController.getHistorialCama(new mongoose.Types.ObjectId(req.query.idOrganizacion), new Date(req.query.fechaDesde), new Date(req.query.fechaHasta), new mongoose.Types.ObjectId(req.query.idCama)).then(result => {
        res.json(result);
    }).catch(error => {
        return next(error);
    });
});

router.get('/camas/internacionCama', Auth.authenticate(), (req, res, next) => {
    camaController.getInternacionCama(new mongoose.Types.ObjectId(req.query.idCama)).then(result => {
        res.json(result);
    }).catch(error => {
        return next(error);
    });
});

/**
 * Busca la cama por su id
 */

router.get('/camas/:idCama', Auth.authenticate(), (req, res, next) => {
    CamaModel.findById({
        _id: req.params.idCama
    }, (err, data: any) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


/**
 * Agrega una nueva cama a la organizacion.
 */

router.post('/camas', Auth.authenticate(), (req, res, next) => {
    const newCama: any = new CamaModel(req.body);
    newCama.unidadOrganizativaOriginal = req.body.estados[0].unidadOrganizativa;
    Auth.audit(newCama, req);
    newCama.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newCama);
    });
});

/**
 * Editar una cama
 */

router.put('/camas/:id', Auth.authenticate(), (req, res, next) => {
    CamaModel.findById(req.params.id, (err3, data: any) => {
        if (err3) {
            return next(404);
        }
        if (data) {
            data.markModified('estados');
            data.markModified('equipamiento');
            data.organizacion = req.body.organizacion;
            data.sectores = req.body.sectores;
            data.nombre = req.body.nombre;
            data.tipoCama = req.body.tipoCama;
            data.observaciones = req.body.observaciones ? req.body.observaciones : '';
            data.equipamiento = req.body.equipamiento;
            if (req.body.estados.length > data.estados.length) {
                data.estados.push(req.body.estados[req.body.estados.length - 1]);
            }
            // agregamos audit a la cama
            Auth.audit(data, req);
            data.save((err2) => {
                if (err2) {
                    return next(err2);
                }
                res.json(data);
            });
        } else {
            res.json(null);
        }

    });
});

router.delete('/camas/eliminarCama/:idCama', Auth.authenticate(), (req, res, next) => {
    CamaModel.findByIdAndRemove(req.params.idCama, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/camas/:idCama', Auth.authenticate(), (req, res, next) => {
    CamaModel.findById({
        _id: req.params.idCama,
    }, (err, data: any) => {
        if (err) {
            return next(err);
        }

        switch (req.body.op) {
            case 'sector':
                if (req.body.sector) {
                    data.sector = req.body.sector;
                }
                break;
            case 'habitacion':
                if (req.body.habitacion) {
                    data.habitacion = req.body.habitacion;
                }
                break;
            case 'nombre':
                if (req.body.nombre) {
                    data.nombre = req.body.nombre;
                }
                break;
            case 'cambioUnidadOrganizativa':
                if (req.body.unidadOrganizativa) {
                    data.unidadOrganizativa.push(req.body.unidadOrganizativa);
                }
                break;
            case 'tipoCama':
                if (req.body.tipoCama) {
                    data.tipoCama = req.body.tipoCama;
                }
                break;
            case 'equipamiento':
                if (req.body.equipamiento) {
                    data.equipamiento.push(req.body.equipamiento);
                }
                break;
            case 'estado':
                if (req.body.estado) {
                    data.estados.push(req.body.estado);
                    data.ultimoEstado = req.body.estado;
                }
                break;
            default:
                return next(500);
        }

        // agregamos audit a la organizacion
        Auth.audit(data, req);
        // guardamos organizacion
        data.save((errUpdate) => {
            if (errUpdate) {
                return next(errUpdate);
            }
            res.json(data);
        });
    });
});

router.patch('/camas/cambiaEstado/:idCama', Auth.authenticate(), async (req, res, next) => {
    try {
        const unaCama: any = await CamaModel.findById({ _id: req.params.idCama });
        if (unaCama) {
            let datas = parseDate(JSON.stringify(req.body));
            // recuperamos el ultimo estado para controlar si el cambio de estados es posible
            unaCama.estados.sort((a, b) => {
                return b.fecha - a.fecha;
            });
            const ultimoEstado = unaCama.estados.find(e => new Date(e.fecha) < new Date(req.body.fecha));
            if (ultimoEstado) {
                if (req.body.estado === ultimoEstado.estado) {
                    unaCama.estados.push(req.body);
                } else {
                    switch (req.body.estado) {
                        case 'reparacion':
                            // validamos que la cama no este ya en reparacion
                            if (ultimoEstado.estado === 'reparacion') {

                                return next('La cama ya fue enviada a reparación');
                            }
                            // validamos que la cama no este ocupada
                            if (ultimoEstado.estado === 'ocupada') {

                                return next('La cama se encuentra ocupada en la fecha registrada, no se puede enviar a reparación');
                            }
                            unaCama.estados.push(req.body);
                            break;
                        case 'desocupada':
                            // verificamos que el estado anterior sea uno de los siguientes.
                            // ocupada, bloqueada o en reparacion.
                            if (ultimoEstado.estado === 'reparacion' || ultimoEstado.estado === 'ocupada' || ultimoEstado.estado === 'bloqueada') {
                                // Limpiamos los datos del paciente
                                if (req.body.sugierePase) {
                                    ultimoEstado.sugierePase = req.body.sugierePase;
                                    delete req.body['sugierePase'];
                                }
                                unaCama.estados.push(req.body);
                            }
                            break;
                        case 'bloqueada':
                            // validamos que la cama no este ocupada
                            if (ultimoEstado.estado === 'ocupada') {
                                return next('La cama se encuentra ocupada en la fecha registrada, no se puede bloquear.');
                            }
                            // actualizamos el estadode la cama
                            unaCama.estados.push(req.body);
                            break;
                        case 'ocupada':
                            if (ultimoEstado.estado !== 'disponible') {
                                return next('La cama no se encuentra disponible en la fecha seleccionada');
                            }
                            if (!req.body.paciente.id) {
                                return next('No puede ocupar una cama sin un paciente');
                            }
                            // actualizamos el estadode la cama
                            unaCama.estados.push(req.body);
                            break;
                        case 'disponible':
                            if (ultimoEstado.estado !== 'desocupada' && ultimoEstado.estado !== 'ocupada' && ultimoEstado.estado !== 'bloqueada') {
                                return next('La cama no se encuentra disponible en la fecha seleccionada');
                            }
                            // actualizamos el estadode la cama
                            unaCama.estados.push(req.body);
                            break;
                        case 'inactiva':
                            if (ultimoEstado.estado === 'ocupada') {
                                return next('La cama se encuentra ocupada en la fecha seleccionada');
                            }
                            // actualizamos el estadode la cama
                            unaCama.estados.push(req.body);
                            break;
                    }
                }

                // agregamos audit a la cama
                Auth.audit(unaCama, req);
                // guardamos la cama
                await unaCama.save();
                return res.json(unaCama);
            } else {
                return next({ message: 'No es posible realizar un cambio de estado anterior a que la cama esté disponible' });
            }
        } else {
            return next(404);
        }

    } catch (err) {
        return next(err);
    }
});


/*
[REVISAR]
function validaCama(camas, nuevaCama) {
    let result = false;
    camas.forEach(_cama => {
        if (_cama.servicio.conceptId === _cama.servicio.conceptId && _cama.habitacion === nuevaCama.habitacion && _cama.numero === nuevaCama.numero) {
            result = true;
        } else if (_cama.habitacion === nuevaCama.habitacion && _cama.numero === nuevaCama.numero) {
            result = true;
        }
    });
    return result;
}
*/


export = router;
