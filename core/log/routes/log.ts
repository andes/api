import * as express from 'express';
import { Logger } from '../../../utils/logService';

let router = express.Router();

router.post('/log/:module/:op', function (req, res, next) {
    let resultado = Logger.log(req, req.params.module, req.params.op, req.body.data, function (err) {
        if (err) {
            return next(err);
        }
        res.json(resultado);
    });
});

module.exports = router;
