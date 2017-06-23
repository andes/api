import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    fecha: Date,
    tipo: {
        type: String,
        enum: ['anulada', 'pendiente', 'ejecucion', 'auditoria', 'aceptada', 'rechazada', 'validada', 'desvinculada']
    }
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
