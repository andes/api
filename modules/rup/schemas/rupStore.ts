import * as mongoose from 'mongoose';
let  gridfs = require('mongoose-gridfs');

/**
 * No podemos inicializar directamente el schema por un defecto del paquete mongoose-gridfs
 */

export function makeFs() {
    let CDAFilesSchema = gridfs({
        collection: 'RupStore',
        model: 'RupStore',
        mongooseConnection: mongoose.connection
    });

    return CDAFilesSchema.model;
}
