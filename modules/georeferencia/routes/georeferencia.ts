import { autocompletarDireccion, geoReferenciar } from '@andes/georeference';
import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { geoKey } from '../../../config.private';
import { importAreasProgramaGeoSalud } from '../controller/areasPrograma';

const router = express.Router();

router.get('/georeferenciar', async (req, res, next) => {
    if (req.query.direccion) {
        try {
            const resultado: any = await geoReferenciar(req.query.direccion as any, geoKey);
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
    if (req.query.texto as any) {
        try {
            const resultado: any = await autocompletarDireccion(req.query.texto as any, geoKey);
            res.json(resultado);
        } catch (err) {
            return next(err);
        }
    } else {
        return next('Parámetros incorrectos');
    }
});


router.post('/areasProgama', Auth.authenticate(), async (req, res, next) => {
    try {
        const resultado: any = await importAreasProgramaGeoSalud();
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

export = router;
