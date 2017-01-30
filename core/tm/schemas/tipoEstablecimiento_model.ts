import * as mongoose from 'mongoose';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento'

var tipoEstablecimiento = mongoose.model('tipoEstablecimiento', tipoEstablecimientoSchema, 'tipoEstablecimiento');
export = tipoEstablecimiento;
