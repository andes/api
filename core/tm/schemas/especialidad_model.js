"use strict";
var mongoose = require("mongoose");
var especialidadSchema = require("./especialidad");
var especialidad_model = mongoose.model('especialidad_model', especialidadSchema, 'especialidad');
module.exports = especialidad_model;
//# sourceMappingURL=especialidad_model.js.map