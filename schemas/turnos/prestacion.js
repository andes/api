"use strict";
var mongoose = require('mongoose');
var prestacionSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    activo: Boolean,
    especialidad: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});
var prestacion = mongoose.model('prestacion', prestacionSchema, 'prestacion');
module.exports = prestacion;
//# sourceMappingURL=prestacion.js.map