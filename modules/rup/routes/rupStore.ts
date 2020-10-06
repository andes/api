import { readFile, storeFile } from '../../../core/tm/controller/file-storage';
import * as express from 'express';
import { asyncHandler } from '@andes/api-tool';
const router = express.Router();

const CollectionName = 'RupStore';

router.get('/store/:id', asyncHandler(async (req, res) => {
    const fileData = await readFile(req.params.id, CollectionName);
    res.contentType(fileData.file.contentType);
    fileData.stream.pipe(res);
}));

router.post('/store', asyncHandler(async (req, res) => {
    const file = req.body.file;
    const metadata = req.body.metadata;
    const data = await storeFile(file, metadata, CollectionName);
    res.json(data);
}));

export = router;
