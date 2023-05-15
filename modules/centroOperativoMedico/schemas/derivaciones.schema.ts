import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { DireccionSchema } from '../../../shared/schemas/direccion';
import * as obraSocialSchema from '../../obraSocial/schemas/obraSocial';
import { DispositivoSchema } from './../../dispositivo/dispositivo.schema';
import { TipoTrasladoSchema } from './tipoTraslado.schema';

export const ESTADOS_DERIVACION = ['solicitada', 'habilitada', 'inhabilitada', 'asignada', 'rechazada', 'aceptada', 'finalizada', 'encomendada'];

const DerivacionHistorialSchema = new mongoose.Schema({
    estado: {
        type: String,
        enum: ESTADOS_DERIVACION
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'intermedia', 'alta', 'especial']
    },
    organizacionDestino: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' },
        nombre: String
    },
    unidadDestino: SnomedConcept,
    dispositivo: DispositivoSchema,
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
    unidadDestino: {
        type: SnomedConcept,
        required: false
    },
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
    dispositivo: DispositivoSchema,
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
            numeroIdentificacion: String,
            sexo: String,
            genero: String,
            nombre: String,
            alias: String,
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
        enum: ['baja', 'media', 'intermedia', 'alta', 'especial']
    },
});

DerivacionSchema.plugin(AuditPlugin);
DerivacionSchema.index({
    cancelada: 1,
    estado: 1,
    'organizacionDestino.id': 1,
    'organizacionOrigen.id': 1
});
export const Derivaciones = mongoose.model('derivaciones', DerivacionSchema, 'derivaciones');
