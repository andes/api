import * as mongoose from 'mongoose';
import * as provinciaSchema from './provincia';

const localidadSchema = new mongoose.Schema({
    nombre: String,
    codLocalidad: String,
    departamento: String,
    provincia: { type: provinciaSchema }
});
const localidad = mongoose.model('localidad', localidadSchema, 'localidad');
export = localidad;
