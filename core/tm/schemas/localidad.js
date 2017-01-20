"use strict";
var mongoose = require('mongoose');
var lugarSchema = require('./lugar');
var localidadSchema = new mongoose.Schema({
    nombre: String,
    provincia: lugarSchema
});
var localidad = mongoose.model('localidad', localidadSchema, 'localidad');
module.exports = localidad;
//# sourceMappingURL=localidad.js.map