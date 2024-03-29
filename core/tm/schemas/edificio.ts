import * as mongoose from 'mongoose';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';

const edificioSchema = new mongoose.Schema({
    descripcion: String,
    contacto: { type: contactoSchema },
    direccion: { type: direccionSchema }
});
export = edificioSchema;
