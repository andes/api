import * as config from '../../../config';
import * as express from 'express';
import * as path from 'path';
import * as descargas from '../controller/descargas';

let router = express.Router();


router.post('/pdf', (req: any, res, next) => {
    descargas.generarPDF(req, res, next);
});

export = router;
