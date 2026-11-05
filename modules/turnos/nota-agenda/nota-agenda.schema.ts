import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const NotaAgendaSchema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    fecha: {
        type: Date,
        required: true
    },
    horaInicio: {
        type: Date,
        required: true
    },
    horaFin: {
        type: Date,
        required: true
    },
    servicioIntermedio: {
        type: nombreSchema,
        required: true
    },
    texto: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    }
});

NotaAgendaSchema.plugin(AuditPlugin);

NotaAgendaSchema.index({
    'organizacion._id': 1,
    fecha: 1,
    'servicioIntermedio._id': 1
});

export const NotaAgenda = mongoose.model('notas-agenda', NotaAgendaSchema, 'notas-agenda');
