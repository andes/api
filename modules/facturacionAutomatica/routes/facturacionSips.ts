import * as mongoose from 'mongoose';
import * as express from 'express';

import * as facturacionCtrl from '../controllers/facturacionCtrl';

let router = express.Router();

router.get('/facturacion', function (req, res, next) {
try {
    let result = facturacionCtrl.facturacionCtrl();
    res.json(result);
} catch (error) {
    res.end(error);
}
});

export = router;
