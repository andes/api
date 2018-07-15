import { geoKey } from './../../../config.private';
import * as express from 'express';
import { model } from '../schemas/log';
import { log } from '../controller/log';
import * as utils from '../../../utils/utils';
import { Auth } from '../../../auth/auth.class';
import { defaultLimit, maxLimit } from './../../../config';

let router = express.Router();

router.post('/', function (req, res, next) {
    // if (!Auth.check(req, 'log:post')) {
    //     return next(403);
    // }
    if (!req.body.key && !req.body.paciente) {
        return next(400);
    }

    log(req, req.body.key, req.body.paciente, req.body.operacion, req.body.valor, req.body.anterior).then(
        (data) => res.json(data),
        (err) => next(err)
    );
});

router.get('/', function (req, res, next) {
    // if (!Auth.check(req, 'log:get')) {
    //     return next(403);
    // }
    if (!req.query.key && !req.query.paciente) {
        return next(400);
    }

    let query = model.find({});
    // Opciones de búsqueda
    if (req.query.key) {
        if (req.query.keyRegEx) {
            query.where('key').regex(new RegExp(req.query.key, 'g'));
        } else {
            query.where('key').equals(req.query.key);
        }
        query.sort({ key: 1, fecha: -1 });
    }
    if (req.query.paciente) {
        query.where('paciente').equals(req.query.paciente);
        query.sort({ paciente: 1, fecha: -1 });
    }
    if (req.query.desde) {
        query.where('fecha').gte(req.query.desde);
    }
    if (req.query.hasta) {
        query.where('fecha').gte(req.query.hasta);
    }

    // Paginado
    query.skip(parseInt(req.query.skip || 0, 10));
    query.limit(Math.min(parseInt(req.query.limit || defaultLimit, 15), maxLimit));

    // Ejecuta la consulta
    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

module.exports = router;
