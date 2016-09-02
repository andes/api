"use strict";
var mongoose = require('mongoose');
var especialidadSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    nivelComplejidad: {
        type: Number,
        required: true
    },
    disciplina: String,
    codigo: {
        sisa: {
            type: Number,
            required: true
        }
    },
    habilitado: {
        type: Boolean,
        required: true
    },
    fechaAlta: Date,
    fechaBaja: Date,
});
var especialidad = mongoose.model('especialidad', especialidadSchema, 'especialidad');
module.exports = especialidad;
//# sourceMappingURL=especialidad.js.map