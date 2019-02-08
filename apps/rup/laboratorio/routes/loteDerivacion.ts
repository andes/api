import * as express from 'express';
import { LoteDerivacion } from './../schemas/loteDerivacion';

let router = express.Router();

router.get('/lotederivaciones/', async (req, res, next) => {
    try {
        LoteDerivacion.find().then((derivaciones: any) => {
            res.json(derivaciones);
        });
    } catch (e) {
        res.json(e);
    }
});

router.post('/lotederivaciones/', async (req, res, next) => {
    try {
        LoteDerivacion.find().then((derivaciones: any) => {
            res.json(derivaciones);
        });
    } catch (e) {
        res.json(e);
    }
});
export = router;
