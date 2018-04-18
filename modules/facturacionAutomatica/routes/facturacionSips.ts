import * as mongoose from 'mongoose';
import * as express from 'express';

import * as facturacionCtrl from '../controllers/facturacionCtrl';

let router = express.Router();

router.get('/pepe',async function  (req, res, next) {
    console.log("Entra a facturacion")
    res.send(await facturacionCtrl.facturacionCtrl());
});

export = router;