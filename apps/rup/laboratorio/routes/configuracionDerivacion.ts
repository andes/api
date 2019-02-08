import * as express from 'express';
import { ConfiguracionDerivacion } from './../schemas/configuracionDerivacion';

let router = express.Router();

router.get('/configuracionderivaciones/', async (req, res, next) => {
    try {
        ConfiguracionDerivacion.find().then((configuraciones: any) => {
            res.json(configuraciones);
        });
    } catch (e) {
        res.json(e);
    }
});

router.post('/configuracionderivaciones/', async (req, res, next) => {
    try {
        ConfiguracionDerivacion.find().then((configuraciones: any) => {
            res.json(configuraciones);
        });
    } catch (e) {
        res.json(e);
    }
});

export = router;
