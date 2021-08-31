/**
 * Schema de archivos adjuntos en una prestación.
 * Se usa para sincronizar desde la appMobile
 */
import * as mongoose from 'mongoose';

export const schema = new mongoose.Schema({
    paciente: mongoose.Schema.Types.ObjectId,
    prestacion: mongoose.Schema.Types.ObjectId,
    profesional: mongoose.Schema.Types.ObjectId,
    registro: mongoose.Schema.Types.ObjectId,
    valor: mongoose.Schema.Types.Mixed,
    estado: {
        type: String,
        enum: ['pending', 'upload', 'sync']
    },
    createdAt:  mongoose.Schema.Types.Date
});

export const model = mongoose.model('prestacion-adjuntos', schema, 'prestaciones-adjuntos');
