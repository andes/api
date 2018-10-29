import { makeFs } from '../schemas/rupStore';
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
        const RupFiles = makeFs();

        RupFiles.write({
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
            const RupFiles = makeFs();
            const contexto = await RupFiles.findById(id);
            const stream2 = RupFiles.readById(id);
            resolve({
                file: contexto,
                stream: stream2
            });

            // var stream1  = RupFiles.readById(id, function (err, buffer) {
            //     if (err) {
            //         return reject(err);
            //     }
            //     resolve({
            //         file: contexto,
            //         buffer
            //     });
            // });
        } catch (e) {
            return reject(e);
        }
    });
}

export function readAsBase64(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const RupFiles = makeFs();
            const contexto = await RupFiles.findById(id);
            const stream2 = RupFiles.readById(id);
            resolve({
                file: contexto,
                stream: stream2
            });
        } catch (e) {
            return reject(e);
        }
    });
}
