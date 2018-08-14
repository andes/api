
import * as mongoose from 'mongoose';
const gridfs = require('mongoose-gridfs');

export function makeFsFirmaAdmin() {
    const ProfesionalesFirmaAdminSchema = gridfs({
        collection: 'ProfesionalesFirmaAdmin',
        model: 'ProfesionalesFirmaAdmin',
        mongooseConnection: mongoose.connection
    });
    // obtain a model
    return ProfesionalesFirmaAdminSchema.model;
}
