
import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFsFirma() {
    const ProfesionalesFirmaSchema = createBucket({
        bucketName: 'ProfesionalesFirma',
        collectionName: 'ProfesionalesFirma',
        mongooseConnection: mongoose.connection
    });
    // obtain a model
    return ProfesionalesFirmaSchema;
}
