"use strict";
var mongoose = require('mongoose');
var codificadorSchema = require('./codificador');
var prestacionSchema = new mongoose.Schema({
    clave: String,
    nombre: String,
    codigo: codificadorSchema,
    //tipo: String,
    moleculas: [{
            prestacion: prestacionSchema,
            requerido: Boolean
        }],
    componente: String,
    requiereEvolucionAdministrativa: Boolean,
    requiereEvolucionCalidad: Boolean,
});
module.exports = prestacionSchema;
//# sourceMappingURL=prestacion.js.map