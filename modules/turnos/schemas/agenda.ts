import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as bloqueSchema from '../../../modules/turnos/schemas/bloque';
import * as turnoSchema from '../../../modules/turnos/schemas/turno';
import * as nombreApellidoSchema from '../../../core/tm/schemas/nombreApellido';
import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    tipoPrestaciones: {
        type: [tipoPrestacionSchema],
        required: true
    },
    profesionales: [nombreApellidoSchema],
    espacioFisico: nombreSchema,
    horaInicio: {
        type: Date,
        required: true
    },
    horaFin: {
        type: Date,
        required: true
    },
    intercalar: {
        type: Boolean,
        default: false
    },
    estado: {
        type: String,
        enum: ['planificacion', 'disponible', 'publicada', 'suspendida', 'pausada'],
        required: true,
        default: 'planificacion'
    },
    // Se debe persistir el valor previo al estado de Pausada, para poder reanudar la agenda
    prePausada: {
        type: String,
        enum: ['planificacion', 'disponible', 'publicada', 'suspendida']
    },
    bloques: [bloqueSchema],
    nota: String,
    sobreturnos: [turnoSchema]

});

// Defino Virtuals
schema.virtual('turnosDisponibles').get(function () {
    let turnosDisponibles = 0;
    this.bloques.forEach(function (bloque) {
        bloque.turnos.forEach(function (turno) {
            if (turno.estado === 'disponible' && turno.horaInicio >= new Date()) {
                turnosDisponibles++;
            }
        });
    });
    return turnosDisponibles;
});


schema.virtual('estadosAgendas').get(function () {
    return this.schema.path('estado').enumValues;
});


// Validaciones
schema.pre('save', function (next) {
    // Intercalar
    if (!/true|false/i.test(this.intercalar)) {
        next(new Error('invalido'));
        // TODO: loopear bloques y definir si horaInicio/Fin son required
        // TODO: si pacientesSimultaneos, tiene que haber cantidadSimultaneos (> 0)
        // TODO: si citarPorBloque, tiene que haber cantidadBloque (> 0)
    }
    // Continuar con la respuesta del servidor
    next();
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

// Exportar modelo
let model = mongoose.model('agenda', schema, 'agenda');

export = model;
