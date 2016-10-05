"use strict";
var mongoose = require('mongoose');
var lugarSchema = require('./lugar');
var ubicacionSchema = new mongoose.Schema({
    localidad: lugarSchema,
    provincia: lugarSchema,
    pais: lugarSchema
});
module.exports = ubicacionSchema;
//# sourceMappingURL=ubicacion.js.map