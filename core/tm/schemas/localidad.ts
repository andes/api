import * as mongoose from 'mongoose';
import * as provinciaSchema from './provincia';

let localidadSchema = new mongoose.Schema({
    nombre: String,
    provincia: { type: provinciaSchema}
});
let localidad = mongoose.model('localidad', localidadSchema, 'localidad');
export = localidad;
