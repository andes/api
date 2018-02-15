import { pacienteSchema } from './../../mpi/schemas/paciente';
import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    fecha: Date,
    estado: {
        type: String,
        enum: ['ocupada', 'desocupada', 'disponible', 'reparacion', 'bloqueada'],
        required: true,
        default: 'desocupada'
    },
    paciente: pacienteSchema,
    idInternacion: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    observaciones: {
        type: String
    }
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
