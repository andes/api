
import { Connections } from '../../../connections';
import * as mongoose from 'mongoose';
let gridfs = require('mongoose-gridfs');
export function makeFsFirmaAdmin() {
 var ProfesionalesFirmaAdminSchema = gridfs({
   collection: 'ProfesionalesFirmaAdmin',
   model: 'ProfesionalesFirmaAdmin',
   mongooseConnection: mongoose.connection
 });
  // obtain a model
 return ProfesionalesFirmaAdminSchema.model;
}
