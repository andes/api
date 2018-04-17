import * as mongoose from 'mongoose';
import * as express from 'express';

import * as facturacionCtrl from '../controllers/facturacionCtrl';

let router = express.Router();

router.get('/pepe', function (req, res, next) {
    console.log("Entra a facturacion")
    facturacionCtrl.facturacionCtrl();
});

export = router;