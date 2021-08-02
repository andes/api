import * as base64_stream from 'base64-stream';
import * as mongoose from 'mongoose';
import * as stream from 'stream';

const { createBucket } = require('mongoose-gridfs');
const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export function makeFs(name) {
    const FilesSchema = createBucket({
        collectionName: name,
        bucketName: name,
        mongooseConnection: mongoose.connection
    });
    // obtain a model
    return FilesSchema;
}

export function storeFile(base64, metadata, name) {
    const match = base64.match(base64RegExp);
    const mime = match[1];
    const data = match[2];

    return new Promise((resolve, reject) => {
        const uniqueId = new mongoose.Types.ObjectId();
        const input = new stream.PassThrough();
        const decoder64 = base64_stream.decode();
        const File = makeFs(name);

        File.writeFile(
            {
                _id: uniqueId,
                filename: uniqueId + '.' + mime.split('/')[1],
                contentType: mime,
                metadata
            },
            input.pipe(decoder64),
            (error, createdFile) => {
                resolve(createdFile);
            }
        );
        input.end(data);
    });
}

export function readFile(id, collectionName): Promise<any> {
    return new Promise(async (resolve, reject) => {
        try {
            const Files = makeFs(collectionName);
            const idFile = mongoose.Types.ObjectId(id);
            const _file = await Files.findOne({ _id: idFile });
            const _stream = Files.readFile({ _id: idFile });
            resolve({
                file: _file,
                stream: _stream
            });

        } catch (e) {
            return reject(e);
        }
    });
}

export function streamToBase64(streamData) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        streamData.on('data', (chunk) => {
            chunks.push(chunk);
        });
        streamData.on('end', () => {
            let result = Buffer.concat(chunks);
            return resolve(result.toString('base64'));
        });
        streamData.on('error', (err) => {
            return reject(err);
        });
    });
}
