import * as express from 'express';
import { profe } from '../schemas/profe';
import { periodoPadronesProfe } from '../schemas/periodoPadronesProfe';

const router = express.Router();

router.get('/profe/', async (req, res, next) => {
    if (req.query.dni) {
        let padron;

        if (req.query.periodo) {
            const date = new Date(req.query.periodo);
            const primerDia = new Date(date.getFullYear(), date.getMonth(), 1);
            const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            padron = { $gte: primerDia, $lt: ultimoDia };
        } else {
            padron = await periodoPadronesProfe.find({}).sort({ $natural: 1 }).limit(1);  // ultimo padron
            padron = padron[0].version;
        }

        profe.find({ dni: Number.parseInt(req.query.dni, 2), version: padron }, (err, data) => {
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
