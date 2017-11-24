
import { Connections } from '../../../connections';
import * as mongoose from 'mongoose';
let gridfs = require('mongoose-gridfs');
export function makeFsFirma() {
 var ProfesionalesFirmaSchema = gridfs({
   collection: 'ProfesionalesFirma',
   model: 'ProfesionalesFirma',
   mongooseConnection: mongoose.connection
 });
  // obtain a model
 return ProfesionalesFirmaSchema.model;
}
