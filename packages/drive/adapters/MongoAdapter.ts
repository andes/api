import { IAdapter } from './IAdapter.interface';
import { Types, mongo } from 'mongoose';

export class MongoAdapter implements IAdapter {
    public name = 'mongo-adapter';
    private gfs;

    constructor({ host, collectionName = 'AndesDriveStore' }) {
        const mongoose = require('mongoose');

        let conn = mongoose.createConnection(host);
        conn.once('open', () => {

            this.gfs = new mongo.GridFSBucket(conn.db, {
                bucketName: 'AndesDriveStore'
            });
        });
    }


    write(stream: NodeJS.WriteStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const objId = new Types.ObjectId();
            const dto = {
                _id: objId,
                filename: String(objId)
            };
            const writeStream = this.gfs.openUploadStreamWithId(objId, String(objId));

            writeStream.on('finish', (file) => {
                return resolve(dto._id.toHexString());
            });

            writeStream.on('error', (err) => {
                return reject(err);
            });

            stream.pipe(writeStream);
        });
    }

    read(uuid: string): Promise<NodeJS.ReadStream> {
        return new Promise((resolve, reject) => {
            const stream = this.gfs.openDownloadStream(
                Types.ObjectId(uuid)
            );
            return resolve(stream);
        });
    }

    delete(uuid: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gfs.delete(Types.ObjectId(uuid), (error) => {
                if (error) {
                    return reject(error);
                }
                return resolve();
            });
        });
    }
}
