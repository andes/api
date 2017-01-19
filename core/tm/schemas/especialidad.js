"use strict";
var mongoose = require("mongoose");
var especialidadSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    complejidad: Number,
    disciplina: String,
    codigo: {
        sisa: {
            type: String,
            required: true
        }
    },
    activo: {
        type: Boolean,
        required: true,
        default: true
    }
});
module.exports = especialidadSchema;
//# sourceMappingURL=especialidad.js.map