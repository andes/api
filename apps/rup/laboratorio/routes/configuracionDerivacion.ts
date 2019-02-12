import * as express from 'express';
import { ConfiguracionDerivacion } from './../schemas/configuracionDerivacion';
import { Auth } from '../../../../auth/auth.class';
import { Types } from 'mongoose';

let router = express.Router();

router.get('/configuracionderivaciones/', async (req, res, next) => {
    try {
        let query: any = {};
        if (req.query.laboratorioDestino) {
            query['laboratorioDestino.id'] = Types.ObjectId(req.query.laboratorioDestino);
        }
        if (req.query.concepto) {
            query['concepto.conceptId'] = req.query.concepto.conceptId;
        }
        res.json(await ConfiguracionDerivacion.find(query).exec());
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
