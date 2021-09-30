import * as express from 'express';
import { asyncHandler } from '@andes/api-tool';
import { profesion } from '../schemas/profesion_model';

const router = express.Router();

router.get('/profesiones/:id', asyncHandler(async (req, res, next) => {
    const prof = await profesion.findById(req.params.id);
    res.json(prof);
}));

router.get('/profesiones/', asyncHandler(async (req, res, next) => {
    const query: any = {};
    if (req.query.codigo) {
        query.codigo = req.query.codigo;
    }
    query.gestionaColegio = false;
    const profesiones = await profesion.find(query).sort({ codigoSISA: 1 });
    res.json(profesiones);
}));

export = router;
