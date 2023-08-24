import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

// 'motivoRechazo' se reemplaza con 'observaciones'. Dejar temporalmente ambos campos y remover 'motivoRechazo' una vez que la implementación de 'observaciones' se
export const PrestacionEstadoSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['anulada', 'pendiente', 'ejecucion', 'auditoria', 'aceptada', 'rechazada', 'validada', 'desvinculada', 'modificada', 'asignada', 'vencida'],
        required: true,
    },
    idOrigenModifica: {
        type: String,
        required: false,
        default: null
    },
    motivoRechazo: {
        type: String,
        required: false,
        default: null
    },
    observaciones: {
        type: String,
        required: false,
        default: null
    }
});

// Habilitar plugin de auditoría
PrestacionEstadoSchema.plugin(AuditPlugin);
