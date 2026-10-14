import { make_Fs } from '../schemas/restriccionHudsStore';
import { Types } from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';
import { findOneGridFS } from '../../../../core/tm/controller/file-storage';

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export async function storeFile(base64, metadata) {
    const match = base64.match(base64RegExp);
    const mime = match[1];
    const data = match[2];

    return new Promise((resolve, reject) => {
        const uniqueId = new Types.ObjectId();
        const input = new stream.PassThrough();
        const decoder64 = base64_stream.decode();
        const ImageFiles = make_Fs();
        const filename = uniqueId.toHexString() + '.' + mime.split('/')[1];


        const uploadStream = ImageFiles.openUploadStreamWithId(
            uniqueId,
            filename,
            {
                contentType: mime,
                metadata
            }
        );

        input.on('error', reject);
        decoder64.on('error', reject);
        uploadStream.on('error', reject);

        uploadStream.on('finish', () => {
            resolve({
                _id: uniqueId,
                filename,
                contentType: mime,
                metadata
            });
        });

        input.pipe(decoder64).pipe(uploadStream);
        input.end(data);
    });
}

export async function readFile(id) {
    const ImageFiles = make_Fs();
    const idFile = new Types.ObjectId(id);

    const contexto = await findOneGridFS(ImageFiles, { _id: idFile });

    if (!contexto) {
        return {
            file: null,
            stream: null
        };
    }

    const imageStream = ImageFiles.openDownloadStream(idFile);

    return {
        file: contexto,
        stream: imageStream
    };
}

export async function deleteFile(id) {
    const ImageFiles = make_Fs();
    const idFile = new Types.ObjectId(id);

    await ImageFiles.delete(idFile);

    return {
        file: idFile
    };
}
