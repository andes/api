import * as express from 'express';
import { prestacionLegacy } from '../schemas/prestacionLegacy';

const router = express.Router();

router.get('/prestacionesLegacy', (req, res, next) => {
    if (req.query.codigo) {
        prestacionLegacy.find({ codigo: req.query.codigo }, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        prestacionLegacy.find({}, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.get('/prestacionesLegacy/:id?', (req, res, next) => {
    if (req.params.id) {
        prestacionLegacy.find({ _id: req.params.id }, (err, data) => {
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
