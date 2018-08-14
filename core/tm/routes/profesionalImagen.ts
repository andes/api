import * as express from 'express';
import { makeFs } from '../schemas/imagenes';
import * as stream from 'stream';
import * as base64 from 'base64-stream';

const router = express.Router();


router.post('/profesionales/file', async (req: any, res, next) => {
    const _base64 = req.body.base64;
    const decoder = base64.decode();
    const input = new stream.PassThrough();
    const CDAFiles = makeFs();
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
    const _base64 = req.params.id;
    const CDAFiles = makeFs();
    const contexto = await CDAFiles.findById(_base64);
    CDAFiles.readById(_base64, (err, buffer) => {
        res.contentType(contexto.contentType);
        res.end(buffer);
    });
});


export = router;
