import * as mongoose from 'mongoose';

var tipoEstablecimientoSchema = new mongoose.Schema({

});

var tipoEstablecimiento = mongoose.model('tipoEstablecimiento', tipoEstablecimientoSchema, 'tipoEstablecimiento');

export = tipoEstablecimiento;