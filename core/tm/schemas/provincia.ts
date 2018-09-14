import * as mongoose from 'mongoose';
import * as paisSchema from './pais';

const provinciaSchema = new mongoose.Schema({
    nombre: String,
    pais: { type: paisSchema}
});

export = provinciaSchema;
