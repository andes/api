import * as express from 'express';
import * as InternacionController from './internacion.controller';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.get('/prestaciones', async (req, res, next) => {
    const organizacionId = Auth.getOrganization(req);

    const prestacionesInternacion = await InternacionController.obtenerPrestaciones(organizacionId, req.query);
    return res.json(prestacionesInternacion);
});

export const InternacionRouter = router;
