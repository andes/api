import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFs() {
    const CDAFilesSchema = createBucket({
        collectionName: 'RupStore',
        bucketName: 'RupStore',
        mongooseConnection: mongoose.connection
    });

    return CDAFilesSchema;
}
