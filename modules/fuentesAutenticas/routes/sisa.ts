import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { matchSisa } from '../../../utils/servicioSisa';
import { getPacienteSisa } from '../../../utils/servicioSisa';
import { Logger } from '../../../utils/logService';

const router = express.Router();

router.get('/sisa', async (req, res, next) => {
    if (!Auth.check(req, 'fa:get:sisa')) {
        return next(403);
    }
    if (req.query) {
        const paciente = req.query;
        try {
            const pacienteSisa = await matchSisa(paciente);
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


router.get('/pacienteSisa', async (req, res, next) => {
    if (!Auth.check(req, 'fa:get:sisa')) {
        return next(403);
    }
    if (req.query) {
        const documento = req.query.documento;
        const sexo = req.query.sexo;
        try {
            const pacienteSisa = await getPacienteSisa(documento, sexo);
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
