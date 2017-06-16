import * as mongoose from 'mongoose';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';

let edificioSchema = new mongoose.Schema({
    descripcion: String,
    contacto: contactoSchema,
    direccion: direccionSchema
});
export = edificioSchema;
