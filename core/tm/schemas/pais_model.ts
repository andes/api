import * as mongoose from 'mongoose';
import * as paisSchema from './pais';

const pais = mongoose.model('pais', paisSchema, 'pais');
export = pais;
