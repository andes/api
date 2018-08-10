import * as express from 'express';
import { prestacionLegacy } from '../schemas/prestacionLegacy';

let router = express.Router();

router.get('/prestacionesLegacy', function (req, res, next) {
    if (req.query.codigo) {
        prestacionLegacy.find({ codigo: req.query.codigo }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        prestacionLegacy.find({}, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.get('/prestacionesLegacy/:id?', function (req, res, next) {
    if (req.params.id) {
        prestacionLegacy.find({ _id: req.params.id }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        res.status(404).send('Error ejecutando el método');
    }
});

export = router;
