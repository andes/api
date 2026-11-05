import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Schema, SchemaTypes, model } from 'mongoose';


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
    identificador: [{
        _id: false,
        fuente: {
            type: String,
            enum: ['snomed', 'sifaho'],
            lowercase: true,
            required: true
        },
        valor: {
            type: String,
            required: true
        }
    }],
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
        id: {
            type: SchemaTypes.ObjectId,
            required: false
        },
        ordenTratamiento: {
            type: Number,
            required: true
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

recetaControlSchema.index({ idPrestacion: 1, idRegistro: 1, 'identificador.valor': 1, 'identificador.fuente': 1 });
recetaControlSchema.index({ idPaciente: 1 });

export const RecetaControl = model('recetaControl', recetaControlSchema, 'recetaControl');
