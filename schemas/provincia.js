"use strict";
var mongoose = require('mongoose');
var lugarSchema = require('./lugar');
var provinciaSchema = new mongoose.Schema({
    nombre: String,
    pais: lugarSchema
});
var provincia = mongoose.model('provincia', provinciaSchema, 'provincia');
module.exports = provincia;
//# sourceMappingURL=provincia.js.map