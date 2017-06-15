import * as express from 'express';
import * as mongoose from 'mongoose';
import { llaveTipoPrestacion } from '../schemas/llaveTipoPrestacion';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';

/**
 * Configuración de Tipo Prestación, incluye llaves
 */

let router = express.Router();

router.get('/tipoPrestacion/:id*?', function (req, res, next) {
    if (req.params.id) {
        llaveTipoPrestacion.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };
            res.json(data);
        });
    } else {
        let query;
        query = llaveTipoPrestacion.find({}); // Trae todos
        query.where('organizacion._id').equals(Auth.getOrganization(req));

        if (req.query.nombre) {
            query.where('tipoPrestacion.nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }

        if (req.query.idTipoPrestacion) {
            query.where('tipoPrestacion._id').equals(req.query.idTipoPrestacion);
        }
        // if (req.query.organizacion) {
        //     query.where('organizacion._id').equals(req.query.organizacion);
        // }

        if (req.query.activa) {
            query.where('activa').equals(req.query.activa);
        }

        query.sort('tipoPrestacion.nombre');
        // let band = false;
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            // Verifica en cada llave que requiere solicitud si está vencida En ese caso, inactiva la llave
            // for (let i = 0; i < data.length; i++) {
            //     if (data[i].llave.solicitud.requerida) {
            //         if (data[i].llave.solicitud.vencimiento < new Date()) {
            //             // Patch
            //             data[i].set('activa', false);
            //             Auth.audit(data[i], req);
            //             data[i].save(function (errOnPatch) {

            //                 Logger.log(req, 'llaveTipoPrestacion', 'update', {
            //                     accion: 'Actualizar configuración de TipoPrestacion',
            //                     ruta: req.url,
            //                     method: req.method,
            //                     data: data[i],
            //                     err: errOnPatch || false
            //                 });

            //                 if (errOnPatch) {
            //                     return next(errOnPatch);
            //                 }
            //             }).then(() => {
            //                 if (i === data.length - 1) {
            //                     band = true;
            //                     res.json(data);
            //                 }

            //             });
            //         }
            //     }
            // }
            // if (!band) {
            // }
            res.json(data);
        });
    }
});

router.post('/tipoPrestacion', function (req, res, next) {
    let insertLlaveTipoPrestacion = new llaveTipoPrestacion(req.body)

    // Debe ir antes del save, y ser una instancia del modelo
    Auth.audit(insertLlaveTipoPrestacion, req);
    insertLlaveTipoPrestacion.save((errOnInsert) => {
        Logger.log(req, 'llaveTipoPrestacion', 'insert', {
            accion: 'Agregar configuración de TipoPrestacion',
            ruta: req.url,
            method: req.method,
            data: insertLlaveTipoPrestacion,
            errOnInsert: errOnInsert || false
        });
        if (errOnInsert) {
            return next(errOnInsert);
        }
        res.json(insertLlaveTipoPrestacion);
    });
});

router.put('/tipoPrestacion/:id', function (req, res, next) {

    let updateLlaveTipoPrestacion = new llaveTipoPrestacion(req.body);

    Auth.audit(updateLlaveTipoPrestacion, req);

    updateLlaveTipoPrestacion.isNew = false;
    updateLlaveTipoPrestacion.save((errOnUpdate) => {

        Logger.log(req, 'llaveTipoPrestacion', 'update', {
            accion: 'Actualizar configuración de TipoPrestacion',
            ruta: req.url,
            method: req.method,
            data: updateLlaveTipoPrestacion,
            err: errOnUpdate || false
        });

        if (errOnUpdate) {
            return next(errOnUpdate);
        }
        res.json(updateLlaveTipoPrestacion);
    });
});

// [A] 2017-05-08: Los patch de ANDES son una mentira
router.patch('/tipoPrestacion/:id', function (req, res, next) {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next('ObjectID Inválido');
    }

    llaveTipoPrestacion.findById(req.params.id, (err, data) => {

        // let patchLlaveTipoPrestacion = new llaveTipoPrestacion(data);

        Auth.audit(data, req);

        // Patch
        data.set(req.body.key, req.body.value);

        data.save(function (errOnPatch) {

            Logger.log(req, 'llaveTipoPrestacion', 'update', {
                accion: 'Actualizar configuración de TipoPrestacion',
                ruta: req.url,
                method: req.method,
                data: data,
                err: errOnPatch || false
            });

            if (errOnPatch) {
                return next(errOnPatch);
            }

            return res.json(data);
        });

    });

});

router.delete('/tipoPrestacion/:id', function (req, res, next) {
    llaveTipoPrestacion.findByIdAndRemove(req.params.id, function (err, data) {

        Logger.log(req, 'llaveTipoPrestacion', 'delete', {
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
