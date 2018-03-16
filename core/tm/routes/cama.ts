import * as express from 'express';
import * as cama from '../schemas/camas';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';

let router = express.Router();

/**
 * Busca la cama por su id.
 */

router.get('/camas/:idCama', Auth.authenticate(), function (req, res, next) {
    cama.model.findById({
        '_id': req.params.idCama
    }, function (err, data: any) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

/**
//  * busca las camas de una organizacion, por defecto trae todas o se
//  * pueden filtrar por estado o habitacion.
//  */

router.get('/camas', Auth.authenticate(), function (req, res, next) {

    let query;
    query = cama.model.find({});
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
    query.sort({ 'numero': 1, 'habitacion': 1 });
    query.exec({}, (err, data) => {
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
    let newCama = new cama.model(req.body);
    // agregamos audit a la cama
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

    cama.model.findById({ _id: req.params.id }, function (err3, data: any) {
        if (err3) {
            return next(404);
        }
        data = req.body;
        // agregamos audit a la cama
        Auth.audit(data, req);
        data.save((err2) => {
            if (err2) {
                return next(err2);
            }
            res.json(data);
        });
    });
});


router.patch('/camas/:idCama', Auth.authenticate(), function (req, res, next) {
    cama.model.findById({
        _id: req.params.idCama,
    }, function (err, data: any) {
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

router.patch('/camas/cambiaEstado/:idCama', Auth.authenticate(), function (req, res, next) {
    cama.model.findById({
        _id: req.params.idCama,
    }, function (err, _cama: any) {
        if (err) {
            return next(err);
        }
        let ultimoEstado = _cama.estados[_cama.estados.length - 1];
        if (req.body.estado === 'reparacion') {
            // validamos que la cama no este ya en reparacion
            if (ultimoEstado.estado === 'reparacion') {

                return res.status(500).send('La cama ya fué enviada a reparación');
            }
            // validamos que la cama no este ocupada
            if (ultimoEstado.estado === 'ocupada') {

                return res.status(500).send('La cama está actualmente ocupada, no se puede enviar a reparación');
            }

            _cama.estados.push(req.body);

        } else if (req.body.estado === 'desocupada') {
            // verificamos que el estado anterior sea uno de los siguientes.
            // ocupada, bloqueada o en reparacion.
            if (ultimoEstado.estado === 'reparacion' || ultimoEstado.estado === 'ocupada' || ultimoEstado.estado === 'bloqueada') {
                // Limpiamos los datos del paciente

                _cama.estados.push(req.body);
            }
        } else if (req.body.estado === 'bloqueada') {
            // validamos que la cama no este ocupada
            if (ultimoEstado.estado === 'ocupada') {
                return res.status(500).send('La cama está actualmente ocupada, no se puede bloquear.');
            }
            // actualizamos el estadode la cama
            _cama.estados.push(req.body);

        } else if (req.body.estado === 'ocupada') {

            if (ultimoEstado.estado !== 'disponible') {
                return res.status(500).send('La cama actualmente no esta preparada');
            }
            if (!req.body.paciente.id) {
                return res.status(500).send('No puede ocupar una cama sin un paciente');
            }
            // actualizamos el estadode la cama
            _cama.estados.push(req.body);

        } else if (req.body.estado === 'disponible') {

            if (ultimoEstado.estado !== 'desocupada' && ultimoEstado.estado !== 'bloqueada') {
                return res.status(500).send('La cama debe estar disponible');
            }
            // actualizamos el estadode la cama
            _cama.estados.push(req.body);
        }
        // agregamos audit a la organizacion
        Auth.audit(_cama, req);
        // guardamos organizacion
        _cama.save((errUpdate) => {
            if (errUpdate) {
                return next(errUpdate);
            }
            res.json(_cama);
        });
    });
});

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


export = router;
