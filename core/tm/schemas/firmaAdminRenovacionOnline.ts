
import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFsFirmaAdminOnline() {
    const ProfesionalesFirmaAdminRenovacionOnlineSchema = createBucket({
        bucketName: 'ProfesionalesAdminFirmaRenovacionOnline',
        collectionName: 'ProfesionalesAdminFirmaRenovacionOnline',
        mongooseConnection: mongoose.connection
    });
    // obtain a model
    return ProfesionalesFirmaAdminRenovacionOnlineSchema;
}
