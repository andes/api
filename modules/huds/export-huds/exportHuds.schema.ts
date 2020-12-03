import * as mongoose from 'mongoose';

// [TODO] Interfaces

export const ExportHudsSchema = new mongoose.Schema({
    fechaDesde: Date,
    fechaHasta: Date,
    pacienteId: mongoose.Schema.Types.ObjectId,
    pacienteNombre: String,
    tipoPrestacion: String,
    idHudsFiles: mongoose.Schema.Types.ObjectId,
    user: Object,
    createdAt: Date,
    updatedAt: Date,
    status: {
        type: String,
        enum: ['pending', 'success', 'error', 'canceled', 'completed'],
        required: true,
        default: 'pending'
    },
});

export const ExportHudsModel = mongoose.model('exportHuds', ExportHudsSchema, 'exportHuds');
