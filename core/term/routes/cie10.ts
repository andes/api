import * as express from 'express';
import * as cie10 from '../schemas/cie10';
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';

let router = express.Router();

router.get('/cie10', function (req, res, next) {
    let filtros = { 'nombre': { '$regex': utils.makePattern(req.query.nombre) } };
    let skip = parseInt(req.query.skip || 0, 10);
    let limit = Math.min(parseInt(req.query.limit || defaultLimit, 10), maxLimit);

    let query = cie10.model.find(filtros).skip(skip).limit(limit).sort('nombre');
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
