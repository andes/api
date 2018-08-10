import { makeFs } from '../schemas/rupStore';
import * as mongoose from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';

let base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export function storeFile(base64, metadata) {
    let match = base64.match(base64RegExp);
    let mime = match[1];
    let data = match[2];

    return new Promise((resolve, reject) => {
        let uniqueId = String(new mongoose.Types.ObjectId());
        let input = new stream.PassThrough();
        let decoder64 = base64_stream.decode();
        let RupFiles = makeFs();

        RupFiles.write({
                _id: uniqueId,
                filename:  uniqueId + '.' + mime.split('/')[1],
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
            let RupFiles = makeFs();
            let contexto = await RupFiles.findById(id);
            let stream2  = RupFiles.readById(id);
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
