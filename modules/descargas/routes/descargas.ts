import * as config from '../../../config';
import * as express from 'express';
import * as path from 'path';
import { Documento } from './../controller/descargas';

let router = express.Router();


router.post('/pdf', (req: any, res, next) => {
    Documento.generarPDF(req, res, next);
});

export = router;
