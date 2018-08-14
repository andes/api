
import * as mongoose from 'mongoose';
let gridfs = require('mongoose-gridfs');

export function makeFsFirma() {
    let ProfesionalesFirmaSchema = gridfs({
        collection: 'ProfesionalesFirma',
        model: 'ProfesionalesFirma',
        mongooseConnection: mongoose.connection
    });
    // obtain a model
    return ProfesionalesFirmaSchema.model;
}
