import * as express from 'express';
import {
    Auth
} from '../../../auth/auth.class';
import {
    getServicioRenaper
} from '../../../utils/servicioRenaper';
import {
    Logger
} from '../../../utils/logService';

const router = express.Router();

router.get('/renaper', async (req: any, res, next) => {
    if (!Auth.check(req, 'fa:get:renaper')) {
        return next(403);
    }
    if (req.query) {
        const paciente = req.query;
        try {
            const resultado: any = await getServicioRenaper(paciente, req.user.usuario);
            // Logueamos la operación de búsqueda en la colección.
            Logger.log(req, 'fa_renaper', 'validar', {
                data: resultado
            });
            res.json(resultado);
        } catch (err) {
            Logger.log(req, 'fa_renaper', 'error', {
                error: err
            });
            return next(err);
        }
    } else {
        return next(500);
    }
});

module.exports = router;
