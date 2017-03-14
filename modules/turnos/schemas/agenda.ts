import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as nombreApellidoSchema from '../../../core/tm/schemas/nombreApellido';
import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    tipoPrestaciones: [tipoPrestacionSchema],
    profesionales: [nombreApellidoSchema],
    espacioFisico: nombreSchema,
    horaInicio: Date,
    horaFin: Date,
    intercalar: Boolean,
    bloques: [{
        horaInicio: Date,
        horaFin: Date,
        cantidadTurnos: Number,
        duracionTurno: Number,
        descripcion: String,
        tipoPrestaciones: [tipoPrestacionSchema],

        accesoDirectoDelDia: Number,
        accesoDirectoProgramado: Number,
        reservadoGestion: Number,
        reservadoProfesional: Number,

        pacienteSimultaneos: Boolean,
        cantidadSimultaneos: Number,
        citarPorBloque: Boolean,
        cantidadBloque: Number,
        turnos: [{
            horaInicio: Date,
            asistencia: {
                type: Boolean,
                default: false
            },
            estado: {
                type: String,
                enum: ['disponible', 'asignado', 'bloqueado']
            },
            nota: String,
            paciente: { // pensar que otros datos del paciente conviene tener
                id: mongoose.Schema.Types.ObjectId,
                nombre: String,
                apellido: String,
                documento: String,
                telefono: String
            },
            tipoPrestacion: tipoPrestacionSchema,
            idPrestacionPaciente: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'prestacionPaciente'
            }
        }],
    }],

    estado: {
        type: String,
        enum: ['Planificada', 'Publicada', 'Suspendida']
    }
});

// Defino Virtuals
schema.virtual('turnosDisponibles').get(function () {
    let turnosDisponibles = 0;
    this.bloques.forEach(function (bloque) {
        bloque.turnos.forEach(function (turno) {
            if (turno.estado === 'disponible') {
                turnosDisponibles++;
            }
        });
    });
    return turnosDisponibles;
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

// Exportar modelo
let model = mongoose.model('agenda', schema, 'agenda');
export = model;
