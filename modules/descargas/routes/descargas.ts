import * as config from '../../../config';
import * as express from 'express';
import * as path from 'path';
import { Documento } from './../controller/descargas';

let router = express.Router();


router.post('/:tipo', (req: any, res, next) => {
    Documento.generar(req, res, next);
});

export = router;
