import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { llaveSchema } from './llave';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

// Exportar Schema
export let llaveTipoPrestacionSchema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    tipoPrestacion: {
        type: tipoPrestacionSchema,
        required: true
    },
    llave: { type: llaveSchema},
    auditable: Boolean,
    activa: {
        type: Boolean,
        required: true,
        default: false
    }
});

// Habilitar plugin de auditoría
llaveTipoPrestacionSchema.plugin(AuditPlugin);

// Exportar Model
export let llaveTipoPrestacion = mongoose.model('llaveTipoPrestacion', llaveTipoPrestacionSchema, 'llaveTipoPrestacion');
