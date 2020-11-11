import * as express from 'express';
import { defaultLimit, maxLimit } from './../../../config';
import { ElementoRUP } from '../schemas/elementoRUP';

const router = express.Router();

router.get('/elementosRUP', async (req, res, next) => {

    const query = ElementoRUP.find({}); // Trae todos
    if (req.query.skip) {
        const skip: number = parseInt(req.query.skip || 0, 10);
        query.skip(skip);
    }
    if (req.query.limit) {
        const limit: number = Math.min(parseInt(req.query.limit || defaultLimit, 10), maxLimit);
        query.limit(limit);
    }
    if (req.query.nombre) {
        query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
    }
    if (req.query.key) {
        query.where('key').equals(RegExp('^.*' + req.query.key + '.*$', 'i'));
    }
    if (req.query.excluir) {
        const ids = req.query.excluir.split(',');
        query.where('_id').nin(ids);
    }
    if (req.query.incluir) {
        const idsIn = req.query.incluir.split(',');
        query.where('_id').in(idsIn);
    }
    if (req.query.granularidad) {
        query.where('tipo').equals(req.query.tipo);
    }
    query.where('activo').equals(true);
    const data = await query;
    res.json(data);
});


export = router;
