import * as mongoose from 'mongoose';
import * as provinciaSchema from './provincia';

var localidadSchema = new mongoose.Schema({
    nombre: String,
    provincia: provinciaSchema
});

var localidad = mongoose.model('localidad', localidadSchema, 'localidad');

export = localidad;
