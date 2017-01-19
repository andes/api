import * as mongoose from 'mongoose';
import * as especialidadSchema from './especialidad';

var especialidad_model = mongoose.model('especialidad_model', especialidadSchema, 'especialidad');

export = especialidad_model;


