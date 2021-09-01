import { asyncHandler } from '@andes/api-tool';
import * as crypto from 'crypto';
import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import { log } from '../schemas/log';
import { SystemLog } from '../system.log';

const router = express.Router();

router.post('/error', asyncHandler(async (req, res, next) => {
    const error = req.body;
    let message = error.message || '';
    const stack = error.stack || '';

    if (typeof message !== 'string') {
        message = JSON.stringify(message);
    }
    // Para identificar errores iguales
    const id = crypto.createHash('md5').update(message).digest('hex');
    const data = {
        message,
        stack,
        _id: id,
        url: req.headers.referer, // Desde que URL de la APP llega el error
    };
    await SystemLog.error('angular-error', data, null, req);
    res.json({ status: 'ok' });

}));

router.post('/operaciones/:module/:op', asyncHandler(async (req, res, next) => {
    if (!Auth.check(req, 'log:post')) {
        return next(403);
    }
    await Logger.log(req, req.params.module, req.params.op, req.body.data);
    res.json({ status: 'ok' });
}));

router.get('/operaciones/:module?', asyncHandler(async (req, res, next) => {
    if (!Auth.check(req, 'log:get')) {
        return next(403);
    }

    const query = log.find({});

    if (req.params.module) {
        query.where('modulo').equals(req.params.module).sort({ fecha: -1 });
    }
    if (req.query.op) {
        query.where('operacion').equals(req.query.op);
    }
    if (req.query.usuario) {
        query.where('usuario.username').equals(req.query.usuario);
    }
    if (req.query.organizacion) {
        query.where('organizacion._id').equals(req.query.organizacion);
    }
    if (req.query.accion) {
        query.where('datosOperacion.accion').equals(req.query.accion);
    }
    if (req.query.count) {
        query.count();
    }
    const data = await query.exec();
    res.json(data);
}));

module.exports = router;
