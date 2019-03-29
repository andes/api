import * as express from 'express';
import { getGeoreferencia, autocompletar } from '../../../utils/serviciosGeoreferencia';

const router = express.Router();

router.get('/georeferenciar', async (req, res, next) => {
    if (req.query.direccion) {
        try {
            const resultado: any = await getGeoreferencia(req.query.direccion);
            res.json(resultado);
        } catch (err) {
            return next(err);
        }
    } else {
        return next('Parámetros incorrectos');
    }
});

router.get('/autocompletar/', async (req, res, next) => {
    if (req.query.texto) {
        try {
            const resultado: any = await autocompletar(req.query.texto);
            res.json(resultado);
        } catch (err) {
            return next(err);
        }
    } else {
        return next('Parámetros incorrectos');
    }
});

export = router;
