import * as express from 'express';
import * as log from '../../../core/log/schemas/log';
import { Logger } from '../../../utils/logService';
import { Auth } from '../../../auth/auth.class';

let router = express.Router();

router.post('/log/:module/:op', function (req, res, next) {
    let operacion = '';
    let modulo = '';
    if (req.params.op) {
        operacion = 'lista espera';
    }
    if (req.params.module) {
        modulo = req.params.module;
    }
    let resultado = Logger.log(req, modulo, operacion, req.body.data, function (err) {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.json(resultado);
    });
});

module.exports = router;
