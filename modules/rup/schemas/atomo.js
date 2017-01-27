"use strict";
var mongoose = require('mongoose');
var codificadorSchema = require('./codificador');
var atomoSchema = new mongoose.Schema({
    nombre: String,
    codigo: codificadorSchema,
    valoresPermitidos: {
        min: Number,
        max: Number,
        unidad: String
    },
    componente: String
});
module.exports = atomoSchema;
//# sourceMappingURL=atomo.js.map