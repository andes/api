import * as mongoose from 'mongoose';
import * as provinciaSchema from './provincia';
import { zonaSanitariasSchema } from './zonaSanitarias';

const localidadSchema = new mongoose.Schema({
    nombre: String,
    codLocalidad: String,
    departamento: String,
    provincia: { type: provinciaSchema },
    zonaSanitaria: zonaSanitariasSchema
});
const localidad = mongoose.model('localidad', localidadSchema, 'localidad');
export = localidad;
