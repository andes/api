import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFs() {
    const COMFilesSchema = createBucket({
        collectionName: 'COMStore',
        bucketName: 'COMStore',
        mongooseConnection: mongoose.connection
    });

    return COMFilesSchema;
}
