import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
// import * as async from 'async';
import { Auth } from './../../../auth/auth.class';
import { Prestacion } from '../../rup/schemas/prestacion';
import { model as PrestacionAdjunto } from '../../rup/schemas/prestacion-adjuntos';
import { NotificationService } from '../../mobileApp/controller/NotificationService';
import { storeFile } from '../../../core/tm/controller/file-storage';
const fs = require('fs');
import { FileMetadata, AndesDrive } from '@andes/drive';

const router = express.Router();

// Acciones desde la app de escitorio

/**
 * Solicita adjuntar una imagen desde la mobile app
 *
 * @param {string} paciente ID del paciente
 * @param {string} prestacion ID de la prestación
 * @param {RegistroSchema} resgistro ID de la prestación
 */

router.post('/prestaciones-adjuntar', Auth.authenticate(), (req: any, res, next) => {

    const registro = req.body.registro;
    const pacienteId = req.body.paciente;
    const prestacionId = req.body.prestacion;
    const profesionalId = req.user.profesional;
    const adjunto = (new PrestacionAdjunto() as any);
    adjunto.paciente = pacienteId;
    adjunto.prestacion = prestacionId;
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
    const id = req.params.id;

    PrestacionAdjunto.findById(id).then((doc: any) => {
        doc.remove().then(() => {
            return res.json({ status: 'ok' });
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
    const estado = req.query.estado || 'pending';
    if (req.query.id) {
        const _id = new mongoose.Types.ObjectId(req.query.id);
        find = PrestacionAdjunto.find({
            _id,
            estado,
            createdAt: { $gt: moment().subtract(30, 'minutes').toDate() }
        }, { prestacion: 1, paciente: 1, valor: 1 });
    } else if (req.user && req.user.profesional) {
        const _profesional = new mongoose.Types.ObjectId(req.user.profesional._id);
        find = PrestacionAdjunto.find({
            profesional: _profesional,
            estado,
            createdAt: { $gt: moment().subtract(30, 'minutes').toDate() }
        }, { prestacion: 1, paciente: 1, valor: 1 });
    } else {
        return next(403);
    }
    find.then(async (docs) => {
        const pendientes = [];
        for (const doc of docs) {
            const obj = doc.toObject();
            const prestacion: any = await Prestacion.findById(doc.prestacion);
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
    const id = req.params.id;
    const value = req.body.valor.documentos;
    const estado = req.body.estado;

    PrestacionAdjunto.findById(id).then(async (doc: any) => {
        const files = [];
        for (const file of value) {
            if (file.ext && file.plain64) {
                file.plain64 = file.plain64.replace(/\n/gi, '');
                if (file.ext === 'pdf') {
                    file.plain64 = file.plain64.replace('image/*', 'application/pdf');
                } else {
                    file.plain64 = file.plain64.replace('image/*', 'image/' + file.ext);
                }
                const metadata: FileMetadata = {
                    ...file,
                    origin: 'rup'
                };
                let writeStream = fs.createWriteStream('archivo.pdf');
                writeStream.write(file.plain64, 'base64');
                const data: any = await AndesDrive.writeFile(writeStream, metadata, req);
                files.push({ id: data._id, ext: file.ext });
            } else {
                files.push(file);
            }
        }
        doc.valor = { documentos: files };
        doc.estado = estado;
        doc.save().then(() => {
            return res.json({ status: 'ok' });
        }).catch(next);
    }).catch((err) => {
        return next(err);
    });
});


export = router;
