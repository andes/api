import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const estrategiaAtencionSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    activa: {
        type: Boolean,
        default: true
    }
});

estrategiaAtencionSchema.plugin(AuditPlugin);

export const EstrategiaAtencion = mongoose.model(
    'estrategiaAtencion',
    estrategiaAtencionSchema,
    'estrategiaAtencion'
);
