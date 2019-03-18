import express = require('express');
import * as logger from '@andes/log';
import * as mongoose from 'mongoose';
import * as config from '../../../config';

let router = express.Router();

router.get('/', async (req, res, next) => {
    // Disable Auth for tests
    // if (!Auth.check(req, 'log:get')) {
    //     return next(403);
    // }
    if (!req.query.key && !req.query.keyRegEx && !req.query.paciente) {
        return next(400);
    }

    // Paginado
    let skip = parseInt(req.query.skip || 0, 10);
    let limit = Math.min(parseInt(req.query.limit || config.defaultLimit, 15), config.maxLimit);
    // Ejecuta la consulta
    try {
        let data = await logger.query(req.query.key || (req.query.keyRegEx && new RegExp(req.query.key, 'g')),
            req.query.paciente && mongoose.Types.ObjectId(req.query.paciente),
            req.query.desde,
            req.query.hasta,
            skip,
            limit);
        res.json(data);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
