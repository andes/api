"use strict";
var mongoose = require('mongoose');
var agendaSchema = new mongoose.Schema({
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
    intercalar: Boolean,
    bloques: [{
            horaInicio: Date,
            horaFin: Date,
            cantidadTurnos: Number,
            duracionTurno: Number,
            descripcion: String,
            prestaciones: [{
                    id: mongoose.Schema.Types.ObjectId,
                    nombre: String
                }],
            accesoDirectoDelDia: Number,
            accesoDirectoProgramado: Number,
            reservadoGestion: Number,
            reservadoProfesional: Number,
            pacienteSimultaneos: Boolean,
            cantidadSimultaneos: Number,
            citarPorBloque: Boolean,
            turnos: [{
                    horaInicio: Date,
                    estado: {
                        type: String,
                        enum: ["disponible", "asignado"]
                    },
                    paciente: {
                        id: mongoose.Schema.Types.ObjectId,
                        nombre: String,
                        apellido: String,
                        documento: String
                    },
                    pacientes: [{
                            id: mongoose.Schema.Types.ObjectId,
                            nombre: String,
                            apellido: String,
                            documento: String
                        }],
                    prestacion: {
                        id: mongoose.Schema.Types.ObjectId,
                        nombre: String
                    }
                }],
        }],
    estado: {
        type: String,
        enum: ["", "Planificada", "Publicada"]
    }
});
var agenda = mongoose.model('agenda', agendaSchema, 'agenda');
module.exports = agenda;
//# sourceMappingURL=agenda.js.map