import * as mongoose from 'mongoose';
const  gridfs = require('mongoose-gridfs');

/**
 * No podemos inicializar directamente el schema por un defecto del paquete mongoose-gridfs
 */

export function makeFs() {
    const CDAFilesSchema = gridfs({
        collection: 'CDAFiles',
        model: 'CDAFiles',
        mongooseConnection: mongoose.connection
    });

    // obtain a model
    return CDAFilesSchema.model;

}
