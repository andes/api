import { readFile, storeFile } from '../../../core/tm/controller/file-storage';
import * as express from 'express';
import { asyncHandler } from '@andes/api-tool';
import { AndesDrive } from '@andes/drive';
const router = express.Router();

const CollectionName = 'RupStore';

router.get('/store/:id', async (req, res, next) => {
    const fileDrive = await AndesDrive.find(req.params.id);
    if (fileDrive) {
        const stream1 = await AndesDrive.read(fileDrive);
        res.contentType(fileDrive.mimetype);
        stream1.pipe(res);
    } else {
        const data = await readFile(req.params.id, CollectionName);
        res.contentType(data.file.contentType);
        data.stream.on('data', (data2) => {
            res.write(data2);
        });
        data.stream.on('end', () => {
            res.end();
        });
    }
});

router.post('/store', asyncHandler(async (req, res) => {
    const file = req.body.file;
    const metadata = req.body.metadata;
    const data = await storeFile(file, metadata, CollectionName);
    res.json(data);
}));

export = router;
