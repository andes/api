import * as express from 'express';
import { Documento } from './../controller/descargas';

const router = express.Router();


router.post('/pdf', (req: any, res, next) => {
    Documento.generarPDF(req, res, next);
});

export = router;
