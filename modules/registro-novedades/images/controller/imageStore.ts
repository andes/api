import { makeFs } from '../schemas/imageStore';
import * as mongoose from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export function storeFile(base64, metadata) {
    const match = base64.match(base64RegExp);
    const mime = match[1];
    const data = match[2];

    return new Promise((resolve, reject) => {
        const uniqueId = String(new mongoose.Types.ObjectId());
        const input = new stream.PassThrough();
        const decoder64 = base64_stream.decode();
        const ImageFiles = makeFs();
        ImageFiles.write({
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

export function readFile(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const ImageFiles = makeFs();
            const contexto = await ImageFiles.findById(id);
            const stream2 = ImageFiles.readById(id);
            resolve({
                file: contexto,
                stream: stream2
            });
        } catch (e) {
            return reject(e);
        }
    });
}

