import * as mongoose from 'mongoose';
import * as paisSchema from './pais';

let pais = mongoose.model('pais', paisSchema, 'pais');
export = pais;
