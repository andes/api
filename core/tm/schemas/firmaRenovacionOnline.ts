
import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFsFirmaOnline() {
    const ProfesionalesFirmaRenovacionOnlineSchema = createBucket({
        bucketName: 'ProfesionalesFirmaRenovacionOnline',
        collectionName: 'ProfesionalesFirmaRenovacionOnline',
        mongooseConnection: mongoose.connection
    });
    return ProfesionalesFirmaRenovacionOnlineSchema;
}
