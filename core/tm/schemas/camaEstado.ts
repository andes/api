import { pacienteSchema } from './../../mpi/schemas/paciente';
import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    idCama: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    estado: {
        type: String,
        enum: ['ocupada', 'desocupada', 'desinfectada', 'libre', 'reparacion', 'bloqueada'],
        required: true,
        default: 'desocupada'
    },
    paciente: {pacienteSchema},
    idInternacion: {
        // Schema de paciente, puede ser NULL
    },
    observaciones: {
        type: String
    }
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
export let camaEstado = mongoose.model('camaEstado', schema, 'camaEstado');
