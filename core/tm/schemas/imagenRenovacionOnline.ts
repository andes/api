
import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

export function makeFsImagenOnline() {
    const ProfesionalesImagenRenovacionOnlineSchema = createBucket({
        bucketName: 'ProfesionalesImagenRenovacionOnline',
        collectionName: 'ProfesionalesImagenRenovacionOnline',
        mongooseConnection: mongoose.connection
    });
    return ProfesionalesImagenRenovacionOnlineSchema;
}
