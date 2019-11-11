import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as espacioFisicoSchema from '../../../modules/turnos/schemas/espacioFisico';
import * as bloqueSchema from '../../../modules/turnos/schemas/bloque';
import * as turnoSchema from '../../../modules/turnos/schemas/turno';
import { NombreApellidoSchema } from '../../../core/tm/schemas/nombreApellido';
import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const schema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    tipoPrestaciones: {
        type: [tipoPrestacionSchema],
        required: true
    },
    profesionales: [NombreApellidoSchema],
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
        enum: ['planificacion', 'disponible', 'publicada', 'suspendida', 'pausada', 'pendienteAsistencia', 'pendienteAuditoria', 'auditada', 'borrada'],
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
    },
    // Una agenda dinamica no tiene turnos predefinidos, estos se van agregando como en una estructura FIFO.
    dinamica: {
        type: Boolean,
        default: false
    },
    cupo: Number
}, { versionKey: false });

// Defino Virtuals
schema.virtual('turnosDisponibles').get(function () {
    let turnosDisponibles = 0;
    const hrFn = this.horaFin;
    this.bloques.forEach((bloque) => {
        bloque.turnos.forEach((turno) => {
            if (turno.estado === 'disponible' && hrFn >= new Date()) {
                turnosDisponibles++;
            }
        });
    });
    return turnosDisponibles;
});

schema.virtual('turnosRestantesDelDia').get(function () {
    let restantesDelDia = 0;
    this.bloques.forEach((bloque) => {
        if (bloque.restantesDelDia > 0) {
            restantesDelDia += bloque.restantesDelDia;
        }
    });
    return restantesDelDia;
});

schema.virtual('turnosRestantesProgramados').get(function () {
    let restantesProgramados = 0;
    this.bloques.forEach((bloque) => {
        if (bloque.restantesProgramados > 0) {
            restantesProgramados += bloque.restantesProgramados;
        }
    });
    return restantesProgramados;
});

schema.virtual('turnosRestantesGestion').get(function () {
    let restantesGestion = 0;
    this.bloques.forEach((bloque) => {
        if (bloque.restantesGestion > 0) {
            restantesGestion += bloque.restantesGestion;
        }
    });
    return restantesGestion;
});

schema.virtual('turnosRestantesProfesional').get(function () {
    let restantesProfesional = 0;
    this.bloques.forEach((bloque) => {
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
    const agenda: any = this;
    if (!/true|false/i.test(agenda.intercalar)) {
        return next(new Error('invalido'));
        // TODO: loopear bloques y definir si horaInicio/Fin son required
        // TODO: si pacientesSimultaneos, tiene que haber cantidadSimultaneos (> 0)
        // TODO: si citarPorBloque, tiene que haber cantidadBloque (> 0)
    }
    // Continuar con la respuesta del servidor
    next();
});

// Habilitar plugin de auditoría
schema.plugin(AuditPlugin);

schema.index({
    horaInicio: 1,
    horaFin: 1,
    'organizacion._id': 1
});

schema.index({
    estado: 1
});

schema.index({
    'sobreturnos.paciente.id': 1,
    estado: 1
});

schema.index({
    'bloques.turnos._id': 1
});

schema.index({
    'bloques.turnos.paciente.id': 1
});

schema.index({
    'sobreturnos._id': 1
});
// Exportar modelo
const model = mongoose.model('agenda', schema, 'agenda');

export = model;
