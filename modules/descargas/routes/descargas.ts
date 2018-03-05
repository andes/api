import * as config from '../../../config';
import * as express from 'express';
import * as path from 'path';
import { Documento } from './../controller/descargas';

let router = express.Router();

/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/:tipo', (req: any, res, next) => {
    Documento.descargar(req, res, next);
});

export = router;
