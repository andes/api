import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import { sisa } from '@andes/fuentes-autenticas';
import { sisa as sisaConfig } from '../../../config.private';

const router = express.Router();

router.get('/sisa', async (req, res, next) => {
    if (!Auth.check(req, 'fa:get:sisa')) {
        return next(403);
    }
    if (req.query) {
        const paciente = req.query;
        try {
            const pacienteSisa = await sisa(paciente, sisaConfig);
            res.json(pacienteSisa);
            Logger.log(req, 'fa_sisa', 'validar', {
                resultado: pacienteSisa
            });
        } catch (err) {
            Logger.log(req, 'fa_sisa', 'error', {
                error: err
            });
            return next(err);
        }
    } else {
        return next(500);
    }
});

module.exports = router;
