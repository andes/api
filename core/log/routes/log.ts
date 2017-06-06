import * as express from 'express';
import { Logger } from '../../../utils/logService';
import { log } from '../schemas/log';

let router = express.Router();

router.post('/:module/:op', function (req, res, next) {
    let resultado = Logger.log(req, req.params.module, req.params.op, req.body.data, function (err) {
        if (err) {
            return next(err);
        }
        res.json(resultado);
    });
});

router.get('/:module?', function (req, res, next) {
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
    if (req.query.count) {
        query.count();
    }
    query.exec((err, data) => {
        if (err) {
            return next(err);
        };
        res.json(data);
    });
});

module.exports = router;
