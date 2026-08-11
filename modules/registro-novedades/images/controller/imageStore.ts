import { makeFs } from '../schemas/imageStore';
import { Types } from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';
import { findOneGridFS } from '../../../../core/tm/controller/file-storage';

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export async function storeFile(base64, metadata) {
    try {
        const match = base64.match(base64RegExp);
        const mime = match[1];
        const data = match[2];
        const uniqueId = new Types.ObjectId();
        const input = new stream.PassThrough();
        const decoder64 = base64_stream.decode();
        const ImageFiles = makeFs();
        const filename = uniqueId + '.' + mime.split('/')[1];
        const uploadStream = ImageFiles.openUploadStreamWithId(
            uniqueId,
            filename,
            {
                contentType: mime,
                metadata
            }
        );
        const result = await new Promise((resolve, reject) => {
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

        return result;
    } catch (e) {
        return e;
    }
}

export async function readFile(id) {
    try {
        const ImageFiles = makeFs();
        const idFile = new Types.ObjectId(id);
        const contexto = await findOneGridFS(
            ImageFiles,
            { _id: idFile }
        );

        if (!contexto) {
            return null;
        }

        return {
            file: contexto,
            stream: ImageFiles.openDownloadStream(idFile)
        };
    } catch (e) {
        return e;
    }
}

