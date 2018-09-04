
import * as mongoose from 'mongoose';
const gridfs = require('mongoose-gridfs');

export function makeFsFirma() {
    const ProfesionalesFirmaSchema = gridfs({
        collection: 'ProfesionalesFirma',
        model: 'ProfesionalesFirma',
        mongooseConnection: mongoose.connection
    });
    // obtain a model
    return ProfesionalesFirmaSchema.model;
}
