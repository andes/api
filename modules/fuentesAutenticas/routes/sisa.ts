
import { matchSisa } from '../../../utils/servicioSisa';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as https from 'https';
// Services
import { Logger } from '../../../utils/logService';
import { Auth } from "../../../auth/auth.class";

let router = express.Router();

router.get('/validar', function (req, res, next) {
    console.log('lalala');
   if (!Auth.check(req, 'fa:get:sisa')) {
        return next(403);
    }
    if (req.query) {
        let paciente = req.query;
                // console.log('PACIENTE ---------------->', paciente);

        try {
            matchSisa(paciente).then(pacienteSisa => {
                console.log('PACIENTE SISA ---------------->', pacienteSisa);
                if (pacienteSisa) {
                    // console.log('RES ----', res);
                     res.json(pacienteSisa);
                }
            })
        } catch (err) {
            console.log('Error catch matchSisa:', err);
            return next(err);
        };
    } else {
         return next(500);
    }
});


module.exports = router;

