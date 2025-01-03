import { make_Fs } from '../schemas/restriccionHudsStore';
import { Types } from 'mongoose';
import * as base64_stream from 'base64-stream';
import * as stream from 'stream';

const base64RegExp = /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)/;

export async function storeFile(base64, metadata) {
    try {
        const match = base64.match(base64RegExp);
        const mime = match[1];
        const data = match[2];
        const writePromise = new Promise((resolve) => {
            const uniqueId = new Types.ObjectId();
            const input = new stream.PassThrough();
            const decoder64 = base64_stream.decode();
            const ImageFiles = make_Fs();
            ImageFiles.writeFile(
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
        const result = await writePromise;
        return result;
    } catch (e) {
        return e;
    }
}

export async function readFile(id) {
    try {
        const ImageFiles = make_Fs();
        const idFile = new Types.ObjectId(id);
        const contexto = await ImageFiles.findOne({ _id: idFile });
        const imageStream = await ImageFiles.readFile({ _id: idFile });
        return {
            file: contexto,
            stream: imageStream
        };
    } catch (e) {
        return e;
    }
}

export async function deleteFile(id) {
    try {
        const ImageFiles = make_Fs();
        const idFile = new Types.ObjectId(id);
        await ImageFiles.unlink(idFile, (error) => { });
        return {
            file: idFile
        };
    } catch (e) {
        return e;
    }
}
