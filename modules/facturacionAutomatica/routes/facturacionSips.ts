import * as mongoose from 'mongoose';
import * as express from 'express';

import * as facturacionCtrl from '../controllers/facturacionCtrl';

let router = express.Router();

router.get('/facturacion', function (req, res, next) {    
    facturacionCtrl.facturacionCtrl();
});

export = router;