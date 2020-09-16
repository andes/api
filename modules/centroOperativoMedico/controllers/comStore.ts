import { makeFs } from '../schemas/comStore.schema';
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
        const COMFiles = makeFs();

        COMFiles.write({
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
            const contexto = await COMFiles.findById(id);
            const stream2 = COMFiles.readById(id);
            resolve({
                file: contexto,
                stream: stream2
            });
        } catch (error) {
            return reject(error);
        }
    });
}

export function readAsBase64(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const COMFiles = makeFs();
            const contexto = await COMFiles.findById(id);
            const stream2 = COMFiles.readById(id);
            resolve({
                file: contexto,
                stream: stream2
            });
        } catch (error) {
            return reject(error);
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
        streamData.on('error', (error) => {
            return reject(error);
        });
    });
}
