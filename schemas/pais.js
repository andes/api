"use strict";
var mongoose = require('mongoose');
var paisSchema = new mongoose.Schema({
    nombre: String
});
var pais = mongoose.model('pais', paisSchema, 'pais');
module.exports = pais;
//# sourceMappingURL=pais.js.map