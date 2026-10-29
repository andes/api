import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Schema, SchemaTypes, model } from 'mongoose';


export const identificadorSubschema = new Schema({
    _id: false,
    nombre: {
        type: String,
        required: false
    },
    conceptId: {
        type: String,
        required: false
    },
    codigo: [{
        _id: false,
        fuente: {
            type: String,
            required: false
        },
        valor: {
            type: String,
            required: false
        }
    }]
}, { _id: false });

export const recetaControlSchema = new Schema({
    idPrestacion: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    idRegistro: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    idPaciente: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    tipo: {
        type: String,
        enum: ['medicamento', 'magistral', 'dispositivo', 'nutricion'],
        required: true
    },
    nombre: {
        type: String,
        required: false
    },
    identificador: {
        type: identificadorSubschema,
        required: false
    },
    tratamientoProlongado: {
        type: Boolean,
        default: false,
        required: true
    },
    cantTotalRecetas: {
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
        receta_id: {
            type: SchemaTypes.ObjectId,
            required: false
        },
        ordenTratamiento: {
            type: Number,
            required: true
        },
        origen: {
            type: String,
            enum: ['andes', 'recetar'],
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

recetaControlSchema.index({ idPrestacion: 1, idRegistro: 1 });
recetaControlSchema.index({ idPaciente: 1 });
recetaControlSchema.index({ estado: 1, createdAt: 1 });
recetaControlSchema.index({ 'identificador.conceptId': 1 });
recetaControlSchema.index({ 'identificador.codigo.valor': 1 });

export const RecetaControl = model('recetaControl', recetaControlSchema, 'recetaControl');


