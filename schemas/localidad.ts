import * as mongoose from 'mongoose';
import * as lugarSchema from './lugar';

var localidadSchema = new mongoose.Schema({
    nombre: String,
    provincia:lugarSchema
});

var localidad = mongoose.model('localidad', localidadSchema, 'localidad');

export = localidad;