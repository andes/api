import * as mongoose from 'mongoose';
import * as nombreSchema from './nombre';

var ubicacionSchema = new mongoose.Schema({
    localidad: nombreSchema,
    provincia: nombreSchema,
    pais: nombreSchema
});

export = ubicacionSchema;