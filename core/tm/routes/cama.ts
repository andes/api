import * as express from 'express';
import * as cama from '../schemas/camas';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';

let router = express.Router();

/**
 * Busca la cama por su id.
 */

router.get('/camas/:idCama', function (req, res, next) {
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

router.get('/camas', function (req, res, next) {

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

router.post('/camas', (req, res, next) => {
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

router.put('/camas/:id', (req, res, next) => {

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


router.patch('/camas/:idCama', function (req, res, next) {
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
            case 'numero':
                if (req.body.numero) {
                    data.numero = req.body.numero;
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


function validaCama(camas, nuevaCama) {
    let result = false;
    camas.forEach(cama => {
        // console.log(cama, '===', nuevaCama);
        if (cama.servicio.conceptId === cama.servicio.conceptId && cama.habitacion === nuevaCama.habitacion && cama.numero === nuevaCama.numero) {
            result = true;
        } else if (cama.habitacion === nuevaCama.habitacion && cama.numero === nuevaCama.numero) {
            result = true;
        }
    });
    return result;
}


export = router;
