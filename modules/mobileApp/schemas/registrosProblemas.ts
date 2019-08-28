import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
export let ProblemaSchema = new mongoose.Schema({
    idProblema: {
        type: String
    },
    idMinutaSQL: {
        type: String
    },

    idMinutaMongo: {
        type: mongoose.Schema.Types.ObjectId,
    },
    responsable: {
        type: String,
        required: true
    },
    problema: {
        type: String,
        required: true
    },
    estado: {
        type: String,
        enum: ['pendiente', 'resuelto', 'en proceso'],
        default: 'pendiente'
    },
    plazo: {
        type: Date,
        required: true
    },
    fechaRegistro: {
        type: Date
    },
    origen: {
        type: String
    },
    adjuntos: [String]
});

ProblemaSchema.plugin(AuditPlugin);
export let Problema = mongoose.model('registroProblema', ProblemaSchema, 'registroProblema');
