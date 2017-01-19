"use strict";
var mongoose = require("mongoose");
var financiadorSchema = new mongoose.Schema({
    nombre: String
});
var financiador = mongoose.model('financiador', financiadorSchema, 'financiador');
module.exports = financiador;
//# sourceMappingURL=financiador.js.map