
import { matchSisa } from '../../../utils/servicioSisa';
import * as express from 'express';
// Services
import { Logger } from '../../../utils/logService';
import { Auth } from '../../../auth/auth.class';

let router = express.Router();

<<<<<<< HEAD
router.get('/validar', function (req, res, next) {
    console.log('lalala');
   if (!Auth.check(req, 'fa:get:sisa')) {
=======
router.get('/sisa', function (req, res, next) {
    if (!Auth.check(req, 'fa:get:sisa')) {
>>>>>>> 1b1e310fd98578b51e8a3163fb618c9ab68c3fc0
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

