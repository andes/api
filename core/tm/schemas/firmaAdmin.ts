
import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFsFirmaAdmin() {
    const ProfesionalesFirmaAdminSchema = createBucket({
        bucketName: 'ProfesionalesFirmaAdmin',
        collectionName: 'ProfesionalesFirmaAdmin',
        connection: mongoose.connection
    });
    return ProfesionalesFirmaAdminSchema;
}
