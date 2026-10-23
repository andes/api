import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { SnomedConcept } from '../rup/schemas/snomed-concept';
import { Schema, SchemaTypes, model } from 'mongoose';


export const recetaControlSchema = new Schema({
    prestacionId: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    registroId: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    pacienteId: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    tipo: {
        type: String,
        enum: ['medicamento', 'magistral', 'dispositivo', 'nutricion'],
        required: true
    },
    codigo: {
        type: SchemaTypes.Mixed,
        required: false
    },
    nombre: {
        type: String,
        required: false
    },
    tratamientoProlongado: {
        type: Boolean,
        default: false,
        required: true
    },
    total: {
        type: Number,
        default: 1,
        required: true
    },
    intento: {
        type: Number,
        default: 0,
        required: true
    },
    estado: {
        type: String,
        enum: ['pendiente', 'incompleto', 'completo', 'suspendido', 'error'],
        default: 'pendiente',
        required: true
    },
    recetas: [{
        _id: false,
        idReceta: {
            type: String,
            required: false
        },
        recetaId: {
            type: SchemaTypes.ObjectId,
            required: false
        },
        ordenTratamiento: {
            type: Number,
            required: true
        },
        origen: {
            type: String,
            enum: ['evento', 'job'],
            required: false
        },
        fecha: {
            type: Date,
            default: Date.now
        }
    }],
    ultimoError: {
        type: SchemaTypes.Mixed,
        required: false
    },
    fechaUltimoIntento: {
        type: Date,
        required: false
    }
});

recetaControlSchema.plugin(AuditPlugin);

recetaControlSchema.index({ prestacionId: 1, registroId: 1 });
recetaControlSchema.index({ pacienteId: 1 });
recetaControlSchema.index({ estado: 1, intento: 1 });
recetaControlSchema.index({ createdAt: 1 });

export const RecetaControl = model('recetaControl', recetaControlSchema, 'recetaControl');

