import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { matchSisa } from '../../../utils/servicioSisa';
import { Logger } from '../../../utils/logService';

let router = express.Router();

router.get('/sisa', function (req, res, next) {
    if (!Auth.check(req, 'fa:get:sisa')) {
        return next(403);
    }
    if (req.query) {
        let paciente = req.query;
        try {
            matchSisa(paciente).then(pacienteSisa => {
                Logger.log(req, 'fa_sisa', 'validar', {
                    resultado: pacienteSisa
                });
                if (pacienteSisa) {
                    // console.log('RES ----', res);
                    res.json(pacienteSisa);
                }
            });
        } catch (err) {
             Logger.log(req, 'fa_sisa', 'error', {
                    error: err
                });
            console.log('Error catch matchSisa:', err);
            return next(err);
        };
    } else {
        return next(500);
    }
});


module.exports = router;

