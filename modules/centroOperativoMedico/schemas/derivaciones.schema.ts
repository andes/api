import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { DireccionSchema } from '../../../shared/schemas/direccion';
import * as obraSocialSchema from '../../obraSocial/schemas/obraSocial';
import { TipoTrasladoSchema } from './tipoTraslado.schema';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';

export const ESTADOS_DERIVACION = ['solicitada', 'habilitada', 'inhabilitada', 'asignada', 'rechazada', 'aceptada', 'finalizada', 'encomendada'];

let DerivacionHistorialSchema = new mongoose.Schema({
    estado: {
        type: String,
        enum: ESTADOS_DERIVACION
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'alta', 'especial']
    },
    organizacionDestino: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' },
        nombre: String
    },
    unidadDestino: SnomedConcept,
    observacion: String,
    adjuntos: mongoose.Schema.Types.Mixed,
    eliminado: Boolean
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
    unidadDestino: SnomedConcept,
    organizacionTraslado: {
        type: {
            nombre: String,
            direccion: {
                type: DireccionSchema
            },
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
    },
    tipoTraslado: TipoTrasladoSchema,
    profesionalSolicitante: {
        nombre: String,
        apellido: String,
        documento: Number,
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'profesional' }
    },
    prestacion: { type: mongoose.Schema.Types.ObjectId, ref: 'prestacion' },
    paciente: {
        type: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'paciente' },
            documento: String,
            sexo: String,
            genero: String,
            nombre: String,
            apellido: String,
            fechaNacimiento: Date,
            ObraSocial: { type: obraSocialSchema }
        },
        required: true
    },
    estado: {
        type: String,
        enum: ESTADOS_DERIVACION
    },
    detalle: String,
    adjuntos: mongoose.Schema.Types.Mixed,
    historial: [DerivacionHistorialSchema],
    cancelada: {
        type: Boolean,
        required: true,
        default: false
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'alta', 'especial']
    },
});

DerivacionSchema.plugin(AuditPlugin);
DerivacionSchema.index({
    cancelada: 1,
    estado: 1,
    'organizacionDestino.id': 1,
    'organizacionOrigen.id': 1
});
export let Derivaciones = mongoose.model('derivaciones', DerivacionSchema, 'derivaciones');
