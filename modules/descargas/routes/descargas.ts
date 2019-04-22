import * as express from 'express';
import { Documento } from './../controller/descargas';
import { Auth } from '../../../auth/auth.class';
import { DocumentoCenso } from './../controller/descargaCenso';
import { DocumentoCensoMensual } from './../controller/descargaCensoMensual';

const router = express.Router();


/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/censo', (req: any, res, next) => {
    let docCenso = new DocumentoCenso();
    docCenso.descargar(req, res, next).then(archivo => {
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

router.post('/censoMensual', (req: any, res, next) => {
    let docCenso = new DocumentoCensoMensual();
    docCenso.descargar(req, res, next).then(archivo => {
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

/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/:tipo?', Auth.authenticate(), (req: any, res, next) => {
    Documento.descargar(req).then(archivo => {
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


router.post('/constanciaPuco/:tipo?', (req: any, res, next) => {
    Documento.descargarDocPuco(req, res, next).then(archivo => {
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
