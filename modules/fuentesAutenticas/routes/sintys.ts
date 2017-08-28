import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { matchSintys } from '../../../utils/servicioSintys';
import { Logger } from '../../../utils/logService';

let router = express.Router();

router.get('/sintys', async function (req, res, next) {
    if (!Auth.check(req, 'fa:get:sintys')) {
        return next(403);
    }
    if (req.query) {
        let paciente = req.query;
        try {
            let pacienteSintys = await matchSintys(paciente);
             res.json(pacienteSintys);
            Logger.log(req, 'fa_sintys', 'validar', {
                resultado: pacienteSintys
            });
        } catch (err) {
            Logger.log(req, 'fa_sintys', 'error', {
                error: err
            });
            return next(err);
        }
    }
});

module.exports = router;

