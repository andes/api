"use strict";
var mongoose = require('mongoose');
var tipoEstablecimientoSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    clasificacion: String
});
var tipoEstablecimiento = mongoose.model('tipoEstablecimiento', tipoEstablecimientoSchema, 'tipoEstablecimiento');
module.exports = tipoEstablecimiento;
//# sourceMappingURL=tipoEstablecimiento.js.map