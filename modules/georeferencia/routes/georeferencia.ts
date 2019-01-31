import * as express from 'express';
import { getGeoreferencia } from '../../../utils/servicioGeoreferencia';

const router = express.Router();

router.post('/getGooglePoint', async (req, res, next) => {
    if (req.body.direccion) {
        try {
            const resultado: any = await getGeoreferencia(req.body.direccion);
            res.json(resultado);
        } catch (err) {
            return next(err);
        }
    } else {
        return next('Parámetros incorrectos');
    }
});
export = router;
