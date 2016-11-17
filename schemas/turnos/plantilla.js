"use strict";
var mongoose = require('mongoose');
var plantillaSchema = new mongoose.Schema({
    nombre: String,
    prestaciones: [{
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        }],
    profesionales: [{
            id: mongoose.Schema.Types.ObjectId,
            nombre: String,
            apellido: String
        }],
    espacioFisico: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    horaInicio: Date,
    horaFin: Date,
    bloques: [{
            horaInicio: Date,
            horaFin: Date,
            cantidadTurnos: Number,
            descripcion: String,
            prestacion: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            },
            accesoDirectoDelDia: Number,
            accesoDirectoProgramado: Number,
            reservadoProgramado: Number,
            reservadoProfesional: Number,
            pacienteSimultaneos: Boolean,
            cantidadSimultaneos: Number,
            citarPorBloque: Boolean
        }]
});
var plantilla = mongoose.model('plantilla', plantillaSchema, 'plantilla');
module.exports = plantilla;
//# sourceMappingURL=plantilla.js.map