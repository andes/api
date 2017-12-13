import { readFile, storeFile } from '../controllers/rupStore';

import * as express from 'express';
let router = express.Router();

router.get('/store/:id', (req, res, next) => {
    readFile(req.params.id).then((data: any)  => {
        res.contentType(data.file.contentType);
        data.stream.on('data', function(data2) {
            res.write(data2);
        });

        data.stream.on('end', function() {
            res.end();
        });
    }).catch(next);
});

router.post('/store', (req, res, next) => {
    let file = req.body.file;
    let metadata = req.body.metadata;
    storeFile(file, metadata).then((data) => {
        res.json(data);
    }).catch(next);
});

export = router;
