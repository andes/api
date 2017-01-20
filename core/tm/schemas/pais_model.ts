import * as mongoose from 'mongoose';
import * as paisSchema from './pais'

var pais = mongoose.model('pais', paisSchema, 'pais');
export = pais;