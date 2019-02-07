import { pacienteSchema } from '../../../core/mpi/schemas/paciente';
import * as mongoose from 'mongoose';
import { SnomedConcept, ISnomedConcept } from './snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let schema = new mongoose.Schema({
    fecha: Date,
    estado: {
        type: String,
        enum: ['ocupada', 'desocupada', 'disponible', 'reparacion', 'bloqueada', 'inactiva'],
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
    },
    esMovimiento: {
        type: Boolean,
        required: true,
        default: false
    },
    sugierePase: {
        type: SnomedConcept,
        required: false,
        default: null
    },

});

// Habilitar plugin de auditoría
schema.plugin(AuditPlugin);
