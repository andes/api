import * as express from 'express';
import { prestacionesLegacy } from '../schemas/prestacionesLegacy';

let router = express.Router();

router.get('/prestacionesLegacy', function (req, res, next) {
    if (req.query.codigo) {
        prestacionesLegacy.find({ 'codigo': req.query.codigo }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        prestacionesLegacy.find({}, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

export = router;
