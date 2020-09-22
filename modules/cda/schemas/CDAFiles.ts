import * as mongoose from 'mongoose';
const { createBucket } = require('mongoose-gridfs');

/**
 * No podemos inicializar directamente el schema por un defecto del paquete mongoose-gridfs
 */

export function makeFs() {
    const CDAFilesSchema = createBucket({
        bucketName: 'CDAFiles',
        collectionName: 'CDAFiles',
        mongooseConnection: mongoose.connection
    });

    // obtain a model
    return CDAFilesSchema;

}
