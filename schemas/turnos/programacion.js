"use strict";
var mongoose = require('mongoose');
var programacionSchema = new mongoose.Schema({
    dia: {
        type: Date,
        required: true
    },
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
    descripcion: String,
    bloques: [{
            horaInicio: Date,
            horaFin: Date,
            cantidadTurnos: Number,
            descripcion: String,
            prestacion: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            },
            deldiaAccesoDirecto: Number,
            deldiaAdmision: Number,
            deldiaSeguimiento: Number,
            deldiaAutocitado: Number,
            programadosAccesoDirecto: Number,
            programadosAdmision: Number,
            programadosSeguimiento: Number,
            programadosAutocitado: Number,
            demandaAccesoDirecto: Number,
            demandaAdmision: Number,
            demandaSeguimiento: Number,
            demandaAutocitado: Number,
            pacienteSimultaneos: Boolean,
            cantidadSimultaneos: Number,
            citarPorBloque: Boolean
        }]
});
var programacion = mongoose.model('formato', programacionSchema, 'programacion');
module.exports = programacion;
//# sourceMappingURL=programacion.js.map