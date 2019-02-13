import * as express from 'express';
import { LoteDerivacion } from './../schemas/loteDerivacion';
import { Auth } from '../../../../auth/auth.class';
import { Types } from 'mongoose';

let router = express.Router();

router.get('/lotederivaciones/', async (req, res, next) => {
    try {
        let query: any = {};
        if (req.query.numeroLote) {
            query['numeroLote'] = req.query.numeroLote;
        }
        if (req.query.fecha) {
            query['fecha'] = req.query.fecha;
        }
        if (req.query.laboratorioOrigen) {
            query['laboratorioOrigen.id'] = Types.ObjectId(req.query.laboratorioOrigen);
        }
        if (req.query.laboratorioDestino) {
            query['laboratorioDestino.id'] = Types.ObjectId(req.query.laboratorioDestino);
        }
        if (req.query.estado) {
            query['estado'] = req.query.estado;
        }
        res.json(await LoteDerivacion.find(query).exec());
        // res.json(query);
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
