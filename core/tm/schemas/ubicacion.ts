import * as mongoose from 'mongoose';
import * as nombreSchema from './nombre';

let ubicacionSchema = new mongoose.Schema({
    localidad: nombreSchema,
    provincia: nombreSchema,
    pais: nombreSchema
});

export = ubicacionSchema;
