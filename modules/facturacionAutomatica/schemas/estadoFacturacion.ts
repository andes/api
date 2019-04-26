import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let schema = new mongoose.Schema();
schema.add({
    tipo: {
        type: String,
        enum: ['sumar', 'recupero']
    },
    estado: {
        type: String,
        enum: ['sin comprobante', 'comprobante sin prestación', 'comprobante con prestación']
    },
    numeroComprobante: String
});