"use strict";
var mongoose = require('mongoose');
var codificadorSchema = new mongoose.Schema({
    nombre: String,
    codigo: String,
    jerarquia: String,
    origen: String
});
module.exports = codificadorSchema;
//# sourceMappingURL=codificador.js.map