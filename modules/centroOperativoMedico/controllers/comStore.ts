import { Types } from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';
import { makeFs } from '../schemas/comStore.schema';
import { findOneGridFS } from 'core/tm/controller/file-storage';

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
        const filename = uniqueId + '.' + mime.split('/')[1];
        const uploadStream = COMFiles.openUploadStreamWithId(
            uniqueId,
            filename,
            {
                contentType: mime,
                metadata
            }
        );

        uploadStream.on('error', reject);
        uploadStream.on('finish', () => {
            resolve({
                _id: uniqueId,
                filename,
                contentType: mime,
                metadata
            });
        });

        input
            .pipe(decoder64)
            .pipe(uploadStream);

        input.end(data);
    });
}

export async function readFile(id): Promise<any> {
    const COMFiles = makeFs();
    const idFile = Types.ObjectId(id);
    const contexto = await findOneGridFS(
        COMFiles,
        { _id: idFile }
    );

    if (!contexto) {
        return null;
    }

    return {
        file: contexto,
        stream: COMFiles.openDownloadStream(idFile)
    };
}

export async function readAsBase64(id) {
    return readFile(id);
}

export function streamToBase64(streamData) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        streamData.on('data', (chunk) => {
            chunks.push(chunk);
        });
        streamData.on('end', () => {
            const result = Buffer.concat(chunks);
            return resolve(result.toString('base64'));
        });
        streamData.on('error', (err) => {
            return reject(err);
        });
    });
}
