
import * as mongoose from 'mongoose';
const gridfs = require('mongoose-gridfs');

export function makeFs() {
    const ProfesionalesFilesSchema = gridfs({
        collection: 'ProfesionalesImagenes',
        model: 'ProfesionalesImagenes',
        mongooseConnection: mongoose.connection
    });
  // obtain a model
    return ProfesionalesFilesSchema.model;
}
