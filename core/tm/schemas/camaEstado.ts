import { pacienteSchema } from './../../mpi/schemas/paciente';
import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';

export let schema = new mongoose.Schema({
    fecha: Date,
    estado: {
        type: String,
        enum: ['ocupada', 'desocupada', 'disponible', 'reparacion', 'bloqueada'],
        required: true,
        default: 'desocupada'
    },
    unidadOrganizativa: {
        type: SnomedConcept,
        required: true
    },
    especialidades: [SnomedConcept],
    esCensable: {
        type: Boolean,
        required: true,
        default: true
    },
    genero: SnomedConcept,
    /* Datos del paciente e internacion si la cama está ocupada */
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
