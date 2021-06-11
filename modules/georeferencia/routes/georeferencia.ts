import * as express from 'express';
import { geoReferenciar, autocompletarDireccion } from '@andes/georeference';
import { geoKey } from '../../../config.private';
import { importAreasProgramaGeoSalud } from '../controller/areasPrograma';

const router = express.Router();

router.get('/georeferenciar', async (req, res, next) => {
    if (req.query.direccion) {
        try {
            const resultado: any = await geoReferenciar(req.query.direccion, geoKey);
            if (resultado) {
                res.json(resultado);
            } else {
                res.json({});
            }
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
            const resultado: any = await autocompletarDireccion(req.query.texto, geoKey);
            res.json(resultado);
        } catch (err) {
            return next(err);
        }
    } else {
        return next('Parámetros incorrectos');
    }
});


router.post('/areasProgama', async (req, res, next) => {
    try {
        const resultado: any = await importAreasProgramaGeoSalud();
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

export = router;
