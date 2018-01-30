import { pacienteSchema } from './../../mpi/schemas/paciente';
import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    idCama: mongoose.Schema.Types.ObjectId,
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

export let camaEstado = mongoose.model('camaEstado', schema, 'camaEstado');
