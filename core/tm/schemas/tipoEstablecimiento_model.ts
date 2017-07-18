import * as mongoose from 'mongoose';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';

let tipoEstablecimiento = mongoose.model('tipoEstablecimiento', tipoEstablecimientoSchema, 'tipoEstablecimiento');
export = tipoEstablecimiento;
