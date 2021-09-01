import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
export const MinutaSchema = new mongoose.Schema({
    idMinuta: {
        type: String
    },
    fecha: {
        type: Date
    },
    quienRegistra: {
        type: String,
        required: true
    },
    participantes: {
        type: String
    },
    temas: {
        type: String
    },
    conclusiones: {
        type: String
    },
    pendientes: {
        type: String
    },
    fechaProxima: {
        type: Date
    },
    lugarProxima: {
        type: String
    },
    origen: {
        type: String
    }
});

MinutaSchema.plugin(AuditPlugin);
export const Minuta = mongoose.model('minuta', MinutaSchema, 'minuta');
