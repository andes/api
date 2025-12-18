import express = require('express');
import * as logger from '@andes/log';
import * as mongoose from 'mongoose';
import * as config from '../../../config';

const router = express.Router();

router.get('/', async (req, res, next) => {
    // Disable Auth for tests
    // if (!Auth.check(req, 'log:get')) {
    //     return next(403);
    // }
    if (!req.query.key as any && !req.query.keyRegEx as any && !req.query.paciente as any) {
        return next(400);
    }

    // Paginado
    const skip = parseInt(req.query.skip as any || 0, 10);
    const limit = Math.min(parseInt(req.query.limit as any || config.defaultLimit, 15), config.maxLimit);
    // Ejecuta la consulta
    try {
        const data = await logger.query(req.query.key as any || (req.query.keyRegEx as any && new RegExp(req.query.key as any, 'g')),
            req.query.paciente as any && mongoose.Types.ObjectId(req.query.paciente as any),
            req.query.desde as any,
            req.query.hasta as any,
            skip,
            limit);
        res.json(data);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
