import { defaultLimit, maxLimit } from './../../../config';
import * as mongoose from 'mongoose';
import * as express from 'express';
import * as utils from '../../../utils/utils';
import * as config from '../../../config';
import * as fs from 'fs';
import { makeFs } from '../schemas/imagenes';

import * as stream from 'stream';
import * as base64 from 'base64-stream';

let router = express.Router();



router.post('/profesionales/file', async (req: any, res, next) => {
    let _base64 = req.body.base64;
    let decoder = base64.decode();
    let input = new stream.PassThrough();
    let CDAFiles = makeFs();
    CDAFiles.write({
            filename:  'hola.png' ,
            contentType: 'image/jpeg',
        },
        input.pipe(decoder),
        function(error, createdFile) {
          res.json(createdFile);
    });
    input.end(_base64);
});
router.get('/file/:id', async (req: any, res, next) => {
    let _base64 = req.params.id;
    let CDAFiles = makeFs();
    let contexto = await CDAFiles.findById(_base64);
    var stream1  = CDAFiles.readById(_base64, function (err, buffer) {
        res.contentType(contexto.contentType);
        res.end(buffer);
    });
});


export = router;
