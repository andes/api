import * as express from 'express';
import * as mongoose from 'mongoose';
// import { llaveTipoPrestacion } from '../../llaves/schemas/llaveTipoPrestacion';
import { auditoriaPrestacionPaciente as auditoria } from '../schemas/auditoriaPrestacionPaciente';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';

/**
 * Auditoría de Prestaciones de Pacientes (collection prestacionPaciente)
 */

let router = express.Router();

router.get('/prestacionPaciente/:id*?', function (req, res, next) {
    if (req.params.id) {
        auditoria.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = auditoria.find({}); // Trae todos
        query.where('organizacion._id').equals(Auth.getOrganization(req));

        if (req.query.nombre) {
            query.where('llaveTipoPrestacion.tipoPrestacion.nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }

        if (req.query.idTipoPrestacion) {
            query.where('llaveTipoPrestacion._id').equals(req.query.idAuditoria);
        }

        query.sort('llaveTipoPrestacion.tipoPrestacion.nombre');
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

            //                 Logger.log(req, 'auditoria', 'update', {
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

router.post('/auditoria', function (req, res, next) {
    let insertAuditoria = new auditoria(req.body);

    // Debe ir antes del save, y ser una instancia del modelo
    Auth.audit(insertAuditoria, req);
    insertAuditoria.save((errOnInsert) => {
        Logger.log(req, 'auditoria', 'insert', {
            accion: 'Agregar configuración de auditoría de prestacionPaciente',
            ruta: req.url,
            method: req.method,
            data: insertAuditoria,
            errOnInsert: errOnInsert || false
        });
        if (errOnInsert) {
            return next(errOnInsert);
        }
        res.json(insertAuditoria);
    });
});

router.put('/prestacionPaciente/:id', function (req, res, next) {

    let updateAuditoria = new auditoria(req.body);

    Auth.audit(updateAuditoria, req);

    updateAuditoria.isNew = false;
    updateAuditoria.save((errOnUpdate) => {

        Logger.log(req, 'auditoria', 'update', {
            accion: 'Actualizar auditoría de prestacionPaciente',
            ruta: req.url,
            method: req.method,
            data: updateAuditoria,
            err: errOnUpdate || false
        });

        if (errOnUpdate) {
            return next(errOnUpdate);
        }
        res.json(updateAuditoria);
    });
});

// [A] 2017-05-08: Los patch de ANDES son una mentira
router.patch('/prestacionPaciente/:id', function (req, res, next) {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next('ObjectID Inválido');
    }
    auditoria.findById(req.params.id, (err, data) => {
        // let patchAuditoria = new auditoria(data);
        Auth.audit(data, req);
        // Patch
        data.set(req.body.key, req.body.value);
        data.save(function (errOnPatch) {
            Logger.log(req, 'auditoria', 'update', {
                accion: 'Actualizar auditoría de prestacionPaciente',
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

router.delete('/prestacionPaciente/:id', function (req, res, next) {
    auditoria.findByIdAndRemove(req.params.id, function (err, data) {
        Logger.log(req, 'auditoria', 'delete', {
            accion: 'Eliminar Aditoría de prestacionPaciente',
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
