import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
// import * as async from 'async';
import { Auth } from './../../../auth/auth.class';
import { model as Prestacion } from '../../rup/schemas/prestacion';
import { model as PrestacionAdjunto } from '../../rup/schemas/prestacion-adjuntos';

import { buscarPaciente } from '../../../core/mpi/controller/paciente';

import { NotificationService } from '../../mobileApp/controller/NotificationService';
import * as passportJWT from 'passport-jwt';

import { storeFile } from '../../rup/controllers/rupStore';

let router = express.Router();

// Acciones desde la app de escitorio

/**
 * Solicita adjuntar una imagen desde la mobile app
 *
 * @param {string} paciente ID del paciente
 * @param {string} prestacion ID de la prestación
 * @param {RegistroSchema} resgistro ID de la prestación
 */

router.post('/prestaciones-adjuntar', Auth.authenticate() , (req: any, res, next) => {

    let registro = req.body.registro;
    let pacienteId = req.body.paciente;
    let prestacionId = req.body.prestacion;
    let profesionalId = req.user.profesional.id;

    let adjunto = (new PrestacionAdjunto() as any);
    adjunto.paciente = pacienteId;
    adjunto.prestacion =  prestacionId;
    adjunto.registro = registro;
    adjunto.profesional = profesionalId;
    adjunto.estado = 'pending';
    adjunto.createdAt = new Date();
    adjunto.save().then(() => {
        // [TODO] Send notifications to devices

        if (req.user.profesional) {
            NotificationService.solicitudAdjuntos((profesionalId), adjunto._id);
        }

        res.json(adjunto);
    }).catch((err) => {
        return next(err);
    });
});

/**
 * Borra la solicitud de adjuntar imagen cuando ya esta todo listo
 */
router.delete('/prestaciones-adjuntar/:id', Auth.authenticate(), (req: any, res, next) => {
    let id = req.params.id;

    PrestacionAdjunto.findById(id).then((doc: any) => {
        doc.remove().then(() => {
            return res.json({status: 'ok'});
        }).catch(next);
    }).catch((err) => {
        return next(err);
    });
});


// Acciones desde la app mobile. Analizar si requieren token de autentificacion.
// Ya que la app mobile no guarda la sessión.

/**
 * Listado de solicitudes de archivos a adjuntar
 */

router.get('/prestaciones-adjuntar', Auth.optionalAuth(), async (req: any, res, next) => {
    let find;
    let estado = req.query.estado || 'pending';
    if (req.query.id) {
        let _id = new mongoose.Types.ObjectId(req.query.id);
        find = PrestacionAdjunto.find({
            _id: _id,
            estado,
            createdAt: { $gt: moment().subtract(30, 'minutes').toDate() }
        }, { prestacion: 1, paciente: 1, valor: 1 });
    } else if (req.user && req.user.profesional) {
        let _profesional = new mongoose.Types.ObjectId(req.user.profesional._id);
        find = PrestacionAdjunto.find({
            profesional: _profesional,
            estado,
            createdAt: { $gt: moment().subtract(30, 'minutes').toDate() }
        }, { prestacion: 1, paciente: 1, valor: 1 });
    } else {
        return next(403);
    }
    find.then( async (docs) => {
        let pendientes = [];
        for (const doc of docs) {
            let obj = doc.toObject();
            let prestacion: any = await Prestacion.findById(doc.prestacion);
            obj.paciente = prestacion.paciente;
            obj.prestacion_nombre = prestacion.solicitud.tipoPrestacion.term;
            obj.fecha = prestacion.solicitud.fecha;
            pendientes.push(obj);
        }
        return res.json(pendientes);
    }).catch((err) => {
        return next(err);
    });

});

/**
 * Carga las fotos adjuntas en la solicitud
 */

router.patch('/prestaciones-adjuntar/:id', Auth.optionalAuth(), async (req: any, res, next) => {
    let id = req.params.id;
    let value = req.body.valor.documentos;
    let estado = req.body.estado;

    PrestacionAdjunto.findById(id).then(async (doc: any) => {

        let files = [];
        for (let file of value) {
            if (file.ext && file.plain64) {
                file.plain64 = file.plain64.replace(/\n/gi, '');
                if (file.ext === 'pdf') {
                    file.plain64 = file.plain64.replace('image/*', 'application/pdf');
                } else {
                    file.plain64 = file.plain64.replace('image/*', 'image/' + file.ext);
                }
                let metadata = {
                    registro: doc.registro,
                    prestacion: doc.prestacion
                };
                let data: any = await storeFile(file.plain64, metadata);
                files.push({ id: data._id, ext: file.ext });
            } else {
                files.push(file);
            }
        }

        doc.valor = { documentos: files };
        doc.estado = estado;
        doc.save().then(() => {
            return res.json({status: 'ok'});
        }).catch(next);
    }).catch((err) => {
        return next(err);
    });
});




export = router;
