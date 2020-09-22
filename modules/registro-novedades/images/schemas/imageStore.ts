import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFs() {
    const CDAFilesSchema = createBucket({
        collectionName: 'ImageStore',
        bucketName: 'ImageStore',
        mongooseConnection: mongoose.connection
    });

    return CDAFilesSchema;
}
