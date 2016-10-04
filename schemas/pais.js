"use strict";
var mongoose = require('mongoose');
var paisSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String
});
var pais = mongoose.model('pais', paisSchema, 'pais');
module.exports = pais;
//# sourceMappingURL=pais.js.map