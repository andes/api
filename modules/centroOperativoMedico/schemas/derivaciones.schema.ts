import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { DireccionSchema } from '../../../shared/schemas/direccion';

export const ESTADOS_DERIVACION = ['pendiente', 'aprobada', 'rechazada', 'asignada', 'denegada', 'aceptada', 'finalizada', 'aceptada por omision'];

let DerivacionHistorialSchema = new mongoose.Schema({
    estado: {
        type: String,
        enum: ESTADOS_DERIVACION
    },
    organizacionDestino: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' },
        nombre: String
    },
    observacion: String
});

DerivacionHistorialSchema.plugin(AuditPlugin);

export const DerivacionSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    fecha: {
        type: Date,
        default: Date.now,
        required: true
    },
    organizacionOrigen: {
        type: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        required: true
    },
    organizacionDestino: {
        type: {
            nombre: String,
            direccion: {
                type: DireccionSchema
            },
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        required: true
    },
    profesionalSolicitante: {
        nombre: String,
        apellido: String,
        documento: Number,
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'profesional' }
    },
    paciente: {
        type: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'paciente' },
            documento: String,
            sexo: String,
            genero: String,
            nombre: String,
            apellido: String,
            fechaNacimiento: Date
        },
        required: true
    },
    estado: {
        type: String,
        enum: ESTADOS_DERIVACION
    },
    detalle: String,
    adjuntos: mongoose.Schema.Types.Mixed,
    historial: [DerivacionHistorialSchema]
});

DerivacionSchema.plugin(AuditPlugin);

export let Derivaciones = mongoose.model('derivaciones', DerivacionSchema, 'derivaciones');