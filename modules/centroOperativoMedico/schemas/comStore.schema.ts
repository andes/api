import * as mongoose from 'mongoose';
const gridfs = require('mongoose-gridfs');

export function makeFs() {
    const COMFilesSchema = gridfs({
        collection: 'COMStore',
        model: 'COMStore',
        mongooseConnection: mongoose.connection
    });

    return COMFilesSchema.model;
}
