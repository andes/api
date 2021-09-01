import * as express from 'express';
import * as procedimientosQuirurgicos from '../schemas/procedimientoQuirurgico';
const router = express.Router();
import { defaultLimit, maxLimit } from './../../../config';

router.get('/procemientosQuirurgicos', (req, res, next) => {
    const conditions = {};
    conditions['$or'] = [];
    conditions['$or'].push({ codigo: RegExp('^' + req.query.nombre + '$', 'i') });
    conditions['$or'].push({ nombre: RegExp('^.*' + req.query.nombre + '.*$', 'i') });
    const query = procedimientosQuirurgicos.model.find(conditions);
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
