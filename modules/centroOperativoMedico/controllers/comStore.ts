import { Types } from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';
import { makeFs } from '../schemas/comStore.schema';

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export function storeFile(base64, metadata) {
    const match = base64.match(base64RegExp);
    const mime = match[1];
    const data = match[2];

    return new Promise((resolve, reject) => {
        const uniqueId = new Types.ObjectId();
        const input = new stream.PassThrough();
        const decoder64 = base64_stream.decode();
        const COMFiles = makeFs();

        COMFiles.writeFile({
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

export function readFile(id): Promise<any> {
    return new Promise(async (resolve, reject) => {
        try {
            const COMFiles = makeFs();
            const idFile = Types.ObjectId(id);
            const contexto = await COMFiles.findOne({ _id: idFile });
            const stream2 = COMFiles.readFile({ _id: idFile });
            resolve({
                file: contexto,
                stream: stream2
            });
        } catch (e) {
            return reject(e);
        }
    });
}

export function readAsBase64(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const COMFiles = makeFs();
            const idFile = Types.ObjectId(id);
            const contexto = await COMFiles.findOne({ _id: idFile });
            const stream2 = COMFiles.readFile({ _id: idFile });
            resolve({
                file: contexto,
                stream: stream2
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
