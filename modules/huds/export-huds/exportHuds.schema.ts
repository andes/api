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
    prestaciones: [mongoose.Schema.Types.ObjectId], // Para el pedido desde el buscador de turnos y prestaciones
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
