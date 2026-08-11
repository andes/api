import * as mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export function createGridFSBucket(bucketName: string): GridFSBucket {
    return new GridFSBucket(mongoose.connection.db, {
        bucketName
    });
}
