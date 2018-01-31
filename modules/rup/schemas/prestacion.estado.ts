import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['anulada', 'pendiente', 'ejecucion', 'auditoria', 'aceptada', 'rechazada', 'validada', 'desvinculada', 'modificada'],
        required: true,
    },
    idOrigenModifica: {
        type: String,
        required: false,
        default: null
    }
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
