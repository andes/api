import * as express from 'express';
import * as InternacionController from './internacion.controller';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.get('/prestaciones', async (req, res, next) => {
    const organizacionId = Auth.getOrganization(req);

    const prestacionesInternacion = await InternacionController.obtenerPrestaciones(organizacionId, req.query);
    return res.json(prestacionesInternacion);
});

router.get('/:capa/:idInternacion/historial', async (req, res, next) => {
    const organizacionId = Auth.getOrganization(req);
    const capa = req.params.capa;
    const idInternacion = req.params.idInternacion;
    const desde = req.query.desde;
    const hasta = req.query.hasta;
    const historialInternacion = await InternacionController.obtenerHistorialInternacion(organizacionId, capa, idInternacion, desde, hasta);
    return res.json(historialInternacion);
});

export const InternacionRouter = router;
