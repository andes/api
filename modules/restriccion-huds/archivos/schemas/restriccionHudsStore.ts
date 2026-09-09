import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function make_Fs() {
    const CDAFilesSchema = createBucket({
        collectionName: 'RestriccionHUDSStore',
        bucketName: 'RestriccionHUDSStore',
        mongooseConnection: mongoose.connection
    });

    return CDAFilesSchema;
}
