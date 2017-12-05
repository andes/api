/**
 * Schema de archivos adjuntos en una prestación.
 * Se usa para sincronizar desde la appMobile
 */
import * as mongoose from 'mongoose';
import * as registro from './prestacion.registro';

export let schema = new mongoose.Schema({
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

export let model = mongoose.model('prestacion-adjuntos', schema, 'prestaciones-adjuntos');
