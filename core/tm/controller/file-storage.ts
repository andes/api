import * as base64_stream from 'base64-stream';
import * as mongoose from 'mongoose';
import * as stream from 'stream';
import { GridFSBucket, ObjectId } from 'mongodb';

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export interface GridFSFileInfo {
    _id: any;
    filename: string;
    contentType?: string;
    length?: number;
    metadata?: any;
    uploadDate?: Date;
    paciente?: any;
    [key: string]: any;
}

export function makeFs(name: string) {
    return new GridFSBucket(mongoose.connection.db, {
        bucketName: name
    });
}

export function storeFile(base64, metadata, name) {
    const match = base64.match(base64RegExp);
    const mime = match[1];
    const data = match[2];

    return new Promise((resolve, reject) => {
        const uniqueId = new mongoose.Types.ObjectId();
        const input = new stream.PassThrough();
        const decoder64 = base64_stream.decode();
        const bucket = makeFs(name);
        const filename = uniqueId + '.' + mime.split('/')[1];
        const uploadStream = bucket.openUploadStreamWithId(
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

export async function readFile(id, collectionName): Promise<any> {
    const bucket = makeFs(collectionName);
    const idFile = mongoose.Types.ObjectId(id);
    const files = await bucket
        .find({ _id: idFile })
        .toArray();

    const file = files[0];

    if (!file) {
        throw new Error('File not found');
    }

    const fileStream = bucket.openDownloadStream(idFile);

    return {
        file,
        stream: fileStream
    };
}

// --------- HELPERS ----------------------------------------

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

export async function findOneGridFS(bucket: GridFSBucket, query: any): Promise<GridFSFileInfo | null> {
    const files = await bucket
        .find(query)
        .limit(1)
        .toArray();

    return files.length ? files[0] as GridFSFileInfo : null;
}

export function readGridFS(bucket: GridFSBucket, id: ObjectId) {
    return bucket.openDownloadStream(id);
}

export async function deleteGridFS(bucket: GridFSBucket, id: ObjectId) {
    await bucket.delete(id);
}

export function streamToBuffer(readStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        readStream.on('data', (chunk) => {
            chunks.push(Buffer.from(chunk));
        });

        readStream.on('error', reject);

        readStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
}
