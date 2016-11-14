"use strict";
var mongoose = require('mongoose');
var espacioFisicoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    activo: Boolean
});
var espacioFisico = mongoose.model('consultorio', espacioFisicoSchema, 'consultorio');
module.exports = espacioFisico;
//# sourceMappingURL=espacioFisico.js.map