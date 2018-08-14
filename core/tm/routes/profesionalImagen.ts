import * as express from 'express';
import { makeFs } from '../schemas/imagenes';
import * as stream from 'stream';
import * as base64 from 'base64-stream';

let router = express.Router();


router.post('/profesionales/file', async (req: any, res, next) => {
    let _base64 = req.body.base64;
    let decoder = base64.decode();
    let input = new stream.PassThrough();
    let CDAFiles = makeFs();
    CDAFiles.write(
        {
            filename:  'hola.png' ,
            contentType: 'image/jpeg',
        },
        input.pipe(decoder),
        (error, createdFile) => {
            res.json(createdFile);
        }
    );
    input.end(_base64);
});
router.get('/file/:id', async (req: any, res, next) => {
    let _base64 = req.params.id;
    let CDAFiles = makeFs();
    let contexto = await CDAFiles.findById(_base64);
    CDAFiles.readById(_base64, (err, buffer) => {
        res.contentType(contexto.contentType);
        res.end(buffer);
    });
});


export = router;
