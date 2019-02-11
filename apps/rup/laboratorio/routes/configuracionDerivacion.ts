import * as express from 'express';
import { ConfiguracionDerivacion } from './../schemas/configuracionDerivacion';
import { Auth } from '../../../../auth/auth.class';

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
    const configuracion = req.body.configuracion;

    let data = new ConfiguracionDerivacion(configuracion);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
