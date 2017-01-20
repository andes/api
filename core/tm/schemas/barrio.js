"use strict";
var mongoose = require('mongoose');
var lugarSchema = require('./lugar');
var barrioSchema = new mongoose.Schema({
    nombre: String,
    localidad: lugarSchema
});
var barrio = mongoose.model('barrio', barrioSchema, 'barrio');
module.exports = barrio;
//# sourceMappingURL=barrio.js.map