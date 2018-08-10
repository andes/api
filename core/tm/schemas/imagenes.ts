
import * as mongoose from 'mongoose';
let gridfs = require('mongoose-gridfs');
export function makeFs() {
 let ProfesionalesFilesSchema = gridfs({
   collection: 'ProfesionalesImagenes',
   model: 'ProfesionalesImagenes',
   mongooseConnection: mongoose.connection
 });
  // obtain a model
 return ProfesionalesFilesSchema.model;
}
