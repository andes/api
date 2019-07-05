import { tipoPrestacionSchema } from './../../tm/schemas/tipoPrestacion';
import { NombreApellidoSchema } from './../../tm/schemas/nombreApellido';

import * as mongoose from 'mongoose';
import * as turnoSchema from '../../../modules/turnos/schemas/turno';

export let logPacienteSchema = new mongoose.Schema({
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'paciente'
    },
    operacion: {
        type: String,
        enum: [
            'turnos:dar',
            'turnos:liberar',
            'turnos:suspender',
            'turnos:reasignar',
            'turnos:asistencia',
            'turnos:confirmarReasignacion',
            'turnos:confirmar',
            'notificacion:sms',
            'notificacion:email',
            'notificacion:push'
        ]
    },
    dataTurno: {
        turno: turnoSchema,
        profesionales: [NombreApellidoSchema],
        tipoPrestacion: tipoPrestacionSchema,
        idBloque: mongoose.Schema.Types.ObjectId,
        idAgenda: mongoose.Schema.Types.ObjectId
    },
    notificacion: {
        texto: String,
        medios: mongoose.Schema.Types.Mixed
    },
    createdAt: Date,
    createdBy: mongoose.Schema.Types.Mixed

});
logPacienteSchema.index({
    paciente: 1,
    operacion: 1,
    createdAt: -1
});
export let logPaciente = mongoose.model('logPaciente', logPacienteSchema, 'logPaciente');
