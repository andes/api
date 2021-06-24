import * as express from 'express';
import * as InternacionController from './internacion.controller';
import { Auth } from '../../../auth/auth.class';
import { Request, Response } from '@andes/api-tool';

const router = express.Router();

const capaMiddleware = (req: Request, res: Response, next: express.NextFunction) => {
    if (req.query?.capa && req.query.capa !== 'estadistica') {
        req.query.capa = 'medica';
    }
    if (req.params?.capa && req.params.capa !== 'estadistica') {
        req.params.capa = 'medica';
    }
    if (req.body?.capa && req.body.capa !== 'estadistica') {
        req.body.capa = 'medica';
    }
    next();
};

router.get('/prestaciones', async (req, res, next) => {
    const organizacionId = Auth.getOrganization(req);

    const prestacionesInternacion = await InternacionController.obtenerPrestaciones(organizacionId, req.query);
    return res.json(prestacionesInternacion);
});

router.get('/:capa/:idInternacion/historial', capaMiddleware, async (req: Request, res: Response, next) => {
    const organizacionId = Auth.getOrganization(req);
    const capa = req.params.capa;
    const idInternacion = req.params.idInternacion;
    const desde = req.query.desde;
    const hasta = req.query.hasta;
    const historialInternacion = await InternacionController.obtenerHistorialInternacion(organizacionId, capa, idInternacion, desde, hasta);
    return res.json(historialInternacion);
});

router.patch('/deshacer', capaMiddleware, async (req: Request, res: Response, next) => {
    const organizacionId = Auth.getOrganization(req);

    const { capa, ambito, idInternacion, completo } = req.body;

    const _completo = await InternacionController.deshacerInternacion(organizacionId, capa, ambito, idInternacion, completo, req);
    return res.status(200).json({ status: _completo });
});

export const InternacionRouter = router;
