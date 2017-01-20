import * as mongoose from 'mongoose';
import * as lugarSchema from './lugar';

var ubicacionSchema = new mongoose.Schema({
    localidad: lugarSchema,
    provincia: lugarSchema,
    pais: lugarSchema
});

export = ubicacionSchema;