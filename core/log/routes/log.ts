import * as express from 'express';
import { Logger } from '../../../utils/logService';
import { log } from '../schemas/log';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.post('/operaciones/:module/:op', (req, res, next) => {
    if (!Auth.check(req, 'log:post')) {
        return next(403);
    }
    Logger.log(req, req.params.module, req.params.op, req.body.data, (err) => {
        if (err) {
            return next(err);
        }
        res.json({ status: 'ok' });
    });
});

router.get('/operaciones/:module?', (req, res, next) => {
    if (!Auth.check(req, 'log:get')) {
        return next(403);
    }
    let query;

    query = log.find({});

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
    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

module.exports = router;
