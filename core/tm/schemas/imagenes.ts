
import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFs() {
    const ProfesionalesFilesSchema = createBucket({
        collectionName: 'ProfesionalesImagenes',
        bucketName: 'ProfesionalesImagenes',
        mongooseConnection: mongoose.connection
    });
    // obtain a model
    return ProfesionalesFilesSchema;
}
