import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let ProblemaSchema = new mongoose.Schema({
    quienRegistra: {
        type: String,
        required: true
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
    origen: {
        type: String
    },
    descripcionOrigen: {
        type: String
    },
    plazo: {
        type: String,
        required: true
    },
    referenciaInforme: {
        type: String
    },
    fechaRegistro: {
        type: Date
    },
    adjuntos: [String],
    idProblema: {
        type: String
    },
});

ProblemaSchema.plugin(AuditPlugin);
export let Problema = mongoose.model('registroProblema', ProblemaSchema, 'registroProblema');
