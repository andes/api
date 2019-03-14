import * as express from 'express';
import * as ocupacion from '../schemas/ocupacion';

import { defaultLimit, maxLimit } from './../../../config';

const router = express.Router();

router.get('/ocupacion', (req, res, next) => {

    let query;
    const conditions = {};
    conditions['$or'] = [];
    conditions['$or'].push({ codigo: RegExp('^' + req.query.nombre + '$', 'i') });
    conditions['$or'].push({ nombre: RegExp('^.*' + req.query.nombre + '.*$', 'i') });
    query = ocupacion.model.find(conditions);
    const skip = parseInt(req.query.skip || 0, 10);
    const limit = Math.min(parseInt(req.query.limit || defaultLimit, 15), maxLimit);
    query.skip(skip);
    query.limit(limit);
    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
