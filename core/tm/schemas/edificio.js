"use strict";
var mongoose = require('mongoose');
var direccionSchema = require('./direccion');
var contactoSchema = require('./contacto');
var edificioSchema = new mongoose.Schema({
    descripcion: String,
    contacto: contactoSchema,
    direccion: direccionSchema
});
module.exports = edificioSchema;
//# sourceMappingURL=edificio.js.map