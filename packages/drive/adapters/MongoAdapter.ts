import { IAdapter } from './IAdapter.interface';
import { Types } from 'mongoose';

export class MongoAdapter implements IAdapter {
    public name = 'mongo-adapter';
    private gfs;

    constructor ({ host, collectionName = 'AndesDriveStore' }) {
        const mongoose = require('mongoose');
        const Grid = require('gridfs-stream');
        Grid.mongo = mongoose.mongo;

        let conn = mongoose.createConnection(host);
        conn.once('open',  () => {
            this.gfs = Grid(conn.db);
            this.gfs.collection(collectionName);
        });
    }


    write (stream: NodeJS.WriteStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const objId = new Types.ObjectId();
            const dto = {
                _id: objId,
                filename: String(objId)
            };
            const writeStream = this.gfs.createWriteStream(dto);
            writeStream.on('close', (file) => {
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
            this.gfs.createReadStream({
                _id: Types.ObjectId(uuid)
            });
        });
    }

    delete (uuid: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gfs.remove({ _id: Types.ObjectId(uuid) }, (error, unlinkedAttachment) => {
                if (error) {
                    return reject(error);
                }
                return resolve();
            });
        });
    }
}
