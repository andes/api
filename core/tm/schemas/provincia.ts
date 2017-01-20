import * as mongoose from 'mongoose';
import * as paisSchema from './pais';

var provinciaSchema = new mongoose.Schema({
    nombre: String,
    pais: paisSchema
});

export = provinciaSchema;