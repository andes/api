import * as mongoose from 'mongoose';
const gridfs = require('mongoose-gridfs');

/**
 * No podemos inicializar directamente el schema por un defecto del paquete mongoose-gridfs
 */

export function makeFs() {
    const CDAFilesSchema = gridfs({
        collection: 'RupStore',
        model: 'RupStore',
        mongooseConnection: mongoose.connection
    });

    return CDAFilesSchema.model;
}
