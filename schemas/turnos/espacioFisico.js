"use strict";
var mongoose = require('mongoose');
var espacioFisicoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String
});
var espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
module.exports = espacioFisico;
//# sourceMappingURL=espacioFisico.js.map