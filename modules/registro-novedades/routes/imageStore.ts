import { readFile, storeFile } from '../controller/imageStore';

import * as express from 'express';
const router = express.Router();

router.get('/store/:id', (req, res, next) => {
    readFile(req.params.id).then((data: any) => {
        res.contentType(data.file.contentType);
        data.stream.on('data', (data2) => {
            res.write(data2);
        });

        data.stream.on('end', () => {
            res.end();
        });
    }).catch(next);
});

router.post('/store', (req, res, next) => {
    const file = req.body.file;
    const metadata = req.body.metadata;
    storeFile(file, metadata).then((data) => {
        res.json(data);
    }).catch(next);
});

export = router;
