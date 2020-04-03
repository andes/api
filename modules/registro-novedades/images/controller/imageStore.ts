import { makeFs } from '../schemas/imageStore';
import * as mongoose from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export async function storeFile(base64, metadata) {
    try {
        const match = base64.match(base64RegExp);
        const mime = match[1];
        const data = match[2];
        let writePromise = new Promise((resolve) => {
            const uniqueId = String(new mongoose.Types.ObjectId());
            const input = new stream.PassThrough();
            const decoder64 = base64_stream.decode();
            const ImageFiles = makeFs();
            ImageFiles.write(
                {
                    _id: uniqueId,
                    filename: uniqueId + '.' + mime.split('/')[1],
                    contentType: mime,
                    metadata
                }, input.pipe(decoder64),
                (error, createdFile) => {
                    resolve(createdFile);
                }
            );
            input.end(data);
        });
        let result = await writePromise;
        return result;
    } catch (e) {
        return e;
    }
}

export async function readFile(id) {
    try {
        const ImageFiles = makeFs();
        const contexto = await ImageFiles.findById(id);
        const imageStream = ImageFiles.readById(id);
        return {
            file: contexto,
            stream: imageStream
        };
    } catch (e) {
        return e;
    }
}

