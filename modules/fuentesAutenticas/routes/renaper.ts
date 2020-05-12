import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import { renaper, renaperToAndes } from '@andes/fuentes-autenticas';
import { RenaperConfig } from '../interfaces';
import { renaper as renaConfig } from '../../../config.private';

const router = express.Router();

router.get('/renaper', async (req: any, res, next) => {
    if (!Auth.check(req, 'fa:get:renaper')) {
        return next(403);
    }
    if (req.query) {
        const paciente = req.query;
        try {
            const renaperConfig: RenaperConfig = {
                usuario: renaConfig.Usuario,
                password: renaConfig.password,
                url: renaConfig.url,
                server: renaConfig.serv
            };
            const resultado: any = await renaper(paciente, renaperConfig, renaperToAndes);
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
