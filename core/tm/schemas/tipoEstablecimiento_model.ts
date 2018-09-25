import * as mongoose from 'mongoose';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';

const tipoEstablecimiento = mongoose.model('tipoEstablecimiento', tipoEstablecimientoSchema, 'tipoEstablecimiento');
export = tipoEstablecimiento;
