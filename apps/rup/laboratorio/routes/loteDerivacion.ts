import * as express from 'express';
import { LoteDerivacion } from './../schemas/loteDerivacion';
import { Auth } from '../../../../auth/auth.class';

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
    const derivacion = req.body.derivacion;

    let data = new LoteDerivacion(derivacion);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
export = router;
