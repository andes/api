"use strict";
var mongoose = require('mongoose');
var tipoEstablecimientoSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    clasificacion: String,
    idTipoEfector: Number
});
module.exports = tipoEstablecimientoSchema;
//# sourceMappingURL=tipoEstablecimiento.js.map