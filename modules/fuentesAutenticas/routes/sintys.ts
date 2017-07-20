import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { matchSintys } from '../../../utils/servicioSintys';
import { Logger } from '../../../utils/logService';

let router = express.Router();

router.get('/sintys', function (req, res, next) {
   if (!Auth.check(req, 'fa:get:sintys')) {
        return next(403);
    }
    if (req.query) {
        let paciente = req.query;
        try {
            matchSintys(paciente).then(pacienteSisa => {
                  Logger.log(req, 'fa_sintys', 'validar', {
                     resultado: pacienteSisa
                });
                if (pacienteSisa) {
                     res.json(pacienteSisa);
                }
            });
        } catch (err) {
             Logger.log(req, 'fa_sintys', 'error', {
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

