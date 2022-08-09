import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as espacioFisicoSchema from '../../../modules/turnos/schemas/espacioFisico';
import * as bloqueSchema from '../../../modules/turnos/schemas/bloque';
import * as turnoSchema from '../../../modules/turnos/schemas/turno';
import { NombreApellidoSchema } from '../../../core/tm/schemas/nombreApellido';
import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { InstitucionSchema } from '../institucion.schema';

export const AgendaSchema = new mongoose.Schema({
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

    link: String,
    otroEspacioFisico: {
        type: InstitucionSchema,
        required: false
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
    motivoDeSuspension: String,
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
    enviarSms: Boolean,
    // Una agenda dinamica no tiene turnos predefinidos, estos se van agregando como en una estructura FIFO.
    dinamica: {
        type: Boolean,
        default: false
    },
    cupo: Number
}, { versionKey: false });

// Defino Virtuals
AgendaSchema.virtual('turnosDisponibles').get(function () {
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

AgendaSchema.virtual('turnosRestantesDelDia').get(function () {
    let restantesDelDia = 0;
    this.bloques.forEach((bloque) => {
        if (bloque.restantesDelDia > 0) {
            restantesDelDia += bloque.restantesDelDia;
        }
    });
    return restantesDelDia;
});

AgendaSchema.virtual('turnosRestantesProgramados').get(function () {
    let restantesProgramados = 0;
    this.bloques.forEach((bloque) => {
        if (bloque.restantesProgramados > 0) {
            restantesProgramados += bloque.restantesProgramados;
        }
    });
    return restantesProgramados;
});

AgendaSchema.virtual('turnosRestantesGestion').get(function () {
    let restantesGestion = 0;
    this.bloques.forEach((bloque) => {
        if (bloque.restantesGestion > 0) {
            restantesGestion += bloque.restantesGestion;
        }
    });
    return restantesGestion;
});

AgendaSchema.virtual('turnosRestantesProfesional').get(function () {
    let restantesProfesional = 0;
    this.bloques.forEach((bloque) => {
        if (bloque.restantesProfesional > 0) {
            restantesProfesional += bloque.restantesProfesional;
        }
    });
    return restantesProfesional;
});


// Validaciones
AgendaSchema.pre('save', function (next) {
    // Intercalar
    const agenda: any = this;
    if (!/true|false/i.test(agenda.intercalar)) {
        return next(new Error('invalido'));
    }
    next();
});

// Habilitar plugin de auditoría
AgendaSchema.plugin(AuditPlugin);

AgendaSchema.index({
    horaInicio: 1,
    horaFin: 1,
    'organizacion._id': 1
});

AgendaSchema.index({
    estado: 1
});

AgendaSchema.index({
    'sobreturnos.paciente.id': 1,
    estado: 1
});

AgendaSchema.index({
    'bloques.turnos._id': 1
});

AgendaSchema.index({
    'bloques.turnos.paciente.id': 1
});

AgendaSchema.index({
    'sobreturnos._id': 1
});

AgendaSchema.index({
    horaInicio: 1,
    'bloques.restantesMobile': 1,
    'bloques.restantesProgramados': 1
}, { name: 'agendas-disponibles', partialFilterExpression: { estado: 'publicada', dinamica: false } });

AgendaSchema.index({
    'organizacion._id': 1,
    'tipoPrestaciones.conceptId': 1,
    horaInicio: 1
});

// Exportar modelo
export const Agenda = mongoose.model('agenda', AgendaSchema, 'agenda');
