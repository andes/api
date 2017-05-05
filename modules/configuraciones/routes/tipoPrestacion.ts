import * as express from 'express';
import { configTipoPrestacion } from '../schemas/configTipoPrestacion';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';

/**
 * Configuración de Tipo Prestación, incluye llaves
 */

let router = express.Router();

router.get('/tipoPrestacion/:id*?', function (req, res, next) {
    if (req.params.id) {
        configTipoPrestacion.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };
            res.json(data);
        });
    } else {
        let query;
        query = configTipoPrestacion.find({}); // Trae todos 

        if (req.query.nombre) {
            query.where('tipoPrestacion.nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }

        if (req.query.organizacion) {
            query.where('organizacion._id').equals(req.query.organizacion);
        }

        if (req.query.activa) {
            query.where('activa').equals(req.query.activa);
        }

        query.sort('tipoPrestacion.nombre');

        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.post('/tipoPrestacion', function (req, res, next) {

    let newConfigTipoPrestacion = new configTipoPrestacion(req.body)

    // Debe ir antes del save, y ser una instancia del modelo
    Auth.audit(newConfigTipoPrestacion, req);

    newConfigTipoPrestacion.save((err) => {

        Logger.log(req, 'configTipoPrestacion', 'insert', {
            accion: 'Agregar configuración de TipoPrestacion',
            ruta: req.url,
            method: req.method,
            data: newConfigTipoPrestacion,
            err: err || false
        });

        if (err) {
            return next(err);
        }
        res.json(newConfigTipoPrestacion);
    })
});

router.put('/tipoPrestacion/:id', function (req, res, next) {

    let data = new configTipoPrestacion(req.body);

    Auth.audit(data, req);

    data.update((errSave) => {

        Logger.log(req, 'configTipoPrestacion', 'update', {
            accion: 'Actualizar configuración de TipoPrestacion',
            ruta: req.url,
            method: req.method,
            data: data,
            err: errSave || false
        });

        if (errSave) {
            return next(errSave);
        }
        res.json(data);
    }, { runValidators: true });
});

router.delete('/tipoPrestacion/:id', function (req, res, next) {
    configTipoPrestacion.findByIdAndRemove(req.params.id, function (err, data) {

        Logger.log(req, 'configTipoPrestacion', 'delete', {
            accion: 'Eliminar Configuración de TipoPrestacion',
            ruta: req.url,
            method: req.method,
            data: data,
            err: err || false
        });

        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
