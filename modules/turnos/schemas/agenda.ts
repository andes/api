import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as espacioFisicoSchema from '../../../modules/turnos/schemas/espacioFisico';
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
    espacioFisico: {
        type: espacioFisicoSchema
    },
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
        enum: ['planificacion', 'disponible', 'publicada', 'suspendida', 'pausada', 'asistenciaCerrada', 'codificada', 'borrada'],
        required: true,
        default: 'planificacion'
    },
    avisos: [{
        _id: false,
        profesionalId: mongoose.Schema.Types.ObjectId,
        fecha: Date,
        estado: {
            type: String,
            enum: ['confirma', 'suspende']
        }
    }],
    // Se debe persistir el valor previo al estado de Pausada, para poder reanudar la agenda
    prePausada: {
        type: String,
        enum: ['planificacion', 'disponible', 'publicada', 'suspendida']
    },
    bloques: [bloqueSchema],
    nota: String,
    sobreturnos: [turnoSchema],
    nominalizada: {
        type: Boolean,
        default: true
    }

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

schema.virtual('turnosRestantesDelDia').get(function () {
    let restantesDelDia = 0;
    this.bloques.forEach(function (bloque) {
        if (bloque.restantesDelDia > 0) {
            restantesDelDia += bloque.restantesDelDia;
        }
    });
    return restantesDelDia;
});

schema.virtual('turnosRestantesProgramados').get(function () {
    let restantesProgramados = 0;
    this.bloques.forEach(function (bloque) {
        if (bloque.restantesProgramados > 0) {
            restantesProgramados += bloque.restantesProgramados;
        }
    });
    return restantesProgramados;
});

schema.virtual('turnosRestantesGestion').get(function () {
    let restantesGestion = 0;
    this.bloques.forEach(function (bloque) {
        if (bloque.restantesGestion > 0) {
            restantesGestion += bloque.restantesGestion;
        }
    });
    return restantesGestion;
});

schema.virtual('turnosRestantesProfesional').get(function () {
    let restantesProfesional = 0;
    this.bloques.forEach(function (bloque) {
        if (bloque.restantesProfesional > 0) {
            restantesProfesional += bloque.restantesProfesional;
        }
    });
    return restantesProfesional;
});



schema.virtual('estadosAgendas').get(function () {
    return this.schema.path('estado').enumValues;
});


// Validaciones
schema.pre('save', function (next) {
    // Intercalar
    if (!/true|false/i.test(this.intercalar)) {
        return next(new Error('invalido'));
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
