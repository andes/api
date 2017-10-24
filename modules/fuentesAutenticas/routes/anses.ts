import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { getServicioAnses } from '../../../utils/servicioAnses';
import { Logger } from '../../../utils/logService';

let router = express.Router();

router.get('/anses', async function (req, res, next) {
    if (!Auth.check(req, 'fa:get:anses')) {
        return next(403);
    }
    if (req.query) {
        let paciente = req.query;
        try {
            let resultado =  await getServicioAnses(paciente);
            res.json(resultado);
            Logger.log(req, 'fa_anses', 'validar', {
                resultado: resultado
            });
        } catch (err) {
            Logger.log(req, 'fa_anses', 'error', {
                error: err
            });
            return next(err);
        }
    } else {
        return next(500);
    }
});


module.exports = router;

