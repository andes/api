"use strict";
var mongoose = require("mongoose");
var tipoEstablecimientoSchema = require("./tipoEstablecimiento");
var tipoEstablecimiento = mongoose.model('tipoEstablecimiento', tipoEstablecimientoSchema, 'tipoEstablecimiento');
module.exports = tipoEstablecimiento;
//# sourceMappingURL=tipoEstablecimiento_model.js.map