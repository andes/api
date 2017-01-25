"use strict";
var mongoose = require('mongoose');
var provinciaSchema = require('./provincia');
var localidadSchema = new mongoose.Schema({
    nombre: String,
    provincia: provinciaSchema
});
var localidad = mongoose.model('localidad', localidadSchema, 'localidad');
module.exports = localidad;
//# sourceMappingURL=localidad.js.map