import * as express from 'express';
import { Documento } from './../controller/descargas';

const router = express.Router();


router.post('/reportes/resultados', (req: any, res, next) => {
    Documento.descargarReportesResultados(req, res, next).then(archivo => {
        res.download((archivo as string), (err) => {
            if (err) {
                next(err);
            } else {
                next();
            }
        });
    }).catch(e => {
        return next(e);
    });
});

export = router;
