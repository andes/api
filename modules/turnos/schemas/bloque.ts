import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as turnoSchema from '../../../modules/turnos/schemas/turno';

let bloqueSchema = new mongoose.Schema({
    horaInicio: Date,
    horaFin: Date,
    cantidadTurnos: {
        type: Number,
        required: true
    },
    duracionTurno: {
        type: Number,
        required: true
    },
    descripcion: String,
    tipoPrestaciones: {
        type: [tipoPrestacionSchema],
        required: true
    },
    accesoDirectoDelDia: {
        type: Number,
        default: 0
    },
    accesoDirectoProgramado: {
        type: Number,
        default: 0
    },
    reservadoGestion: {
        type: Number,
        default: 0
    },
    reservadoProfesional: {
        type: Number,
        default: 0
    },
    restantesDelDia: {
        type: Number,
        default: 0
    },
    restantesProgramados: {
        type: Number,
        default: 0
    },
    restantesGestion: {
        type: Number,
        default: 0
    },
    restantesProfesional: {
        type: Number,
        default: 0
    },
    pacienteSimultaneos: {
        type: Boolean,
        default: false
    },
    cantidadSimultaneos: Number,
    citarPorBloque: {
        type: Boolean,
        default: false
    },
    cantidadBloque: Number,
    turnos: [turnoSchema]
});

export = bloqueSchema;
