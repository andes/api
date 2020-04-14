import * as express from 'express';
import * as CensosController from './censo.controller';
import { asyncHandler } from '@andes/api-tool';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.get('/censo-diario', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);
    const unidadOrganizativa = req.query.unidadOrganizativa;
    const fecha = req.query.fecha;

    const result = await CensosController.censoDiario({
        organizacion,
        timestamp: fecha,
        unidadOrganizativa
    });

    await CensosController.storeCenso(organizacion, unidadOrganizativa, result.censo, fecha);

    res.json(result);
}));

router.get('/censo-mensual', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    const organizacion = Auth.getOrganization(req);
    const result = await CensosController.censoMensual({
        organizacion,
        unidadOrganizativa: req.query.unidadOrganizativa,
        fechaDesde: req.query.fechaDesde,
        fechaHasta: req.query.fechaHasta
    });

    res.json(result);
}));

export const CensosRouter = router;
