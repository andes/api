import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const FallecimientoManualSchema = new mongoose.Schema({
    fecha: {
        type: Date,
        required: true
    }
}, { _id: false }); // embebido, sin ID propio

FallecimientoManualSchema.plugin(AuditPlugin);
