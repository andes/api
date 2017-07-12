
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
            'turno:reasignar',
            'turno:confirmarReasignacion',
            'notificacion:sms',
            'notificacion:email',
            'notificacion:push'
        ]
    },
    dataTurno: {
        turno: turnoSchema,
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

export let logPaciente = mongoose.model('logPaciente', logPacienteSchema, 'logPaciente');
