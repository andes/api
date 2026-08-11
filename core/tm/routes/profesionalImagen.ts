import * as express from 'express';
import { Types } from 'mongoose';
import { makeFs } from '../schemas/imagenes';
import * as stream from 'stream';
import * as base64 from 'base64-stream';
const router = express.Router();

router.post('/profesionales/file', async (req: any, res, next) => {
    const _base64 = req.body.base64;
    const decoder = base64.decode();
    const input = new stream.PassThrough();
    const files = makeFs();
    const filename = 'filename.png';
    const contentType = 'image/jpeg';
    const uploadStream = files.openUploadStream(filename, {
        contentType
    });

    uploadStream.on('error', next);
    uploadStream.on('finish', () => {
        res.json({
            _id: uploadStream.id,
            filename,
            contentType
        });
    });

    input
        .pipe(decoder)
        .pipe(uploadStream);

    input.end(_base64);
});

router.get('/file/:id', async (req: any, res, next) => {
    try {
        const files = makeFs();
        const id = Types.ObjectId(req.params.id);
        const encontrados = await files
            .find({ _id: id })
            .limit(1)
            .toArray();
        const contexto: any = encontrados[0];

        if (!contexto) {
            return next(404);
        }

        res.contentType(contexto.contentType);

        const downloadStream = files.openDownloadStream(id);

        downloadStream.on('error', next);
        downloadStream.pipe(res);

    } catch (error) {
        next(error);
    }
});

export = router;
