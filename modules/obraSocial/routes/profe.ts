import * as express from 'express';
import { profe } from '../schemas/profe';
import { periodoPadronesProfe } from '../schemas/periodoPadronesProfe';

let router = express.Router();

router.get('/profe/', async function (req, res, next) {
    if (req.query.dni) {
        let padron;

        if (req.query.periodo) {
            padron = req.query.periodo.substring(0, 7); // YYYY/MM
        } else {
            padron = await periodoPadronesProfe.find({}).sort({ $natural: 1 }).limit(1);  // ultimo padron
            padron = padron[0].version;
        }

        profe.find({ dni: Number.parseInt(req.query.dni), version: { $regex: padron } }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});

module.exports = router;
