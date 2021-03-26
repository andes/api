import { Schema, model } from 'mongoose';

export const GrupoPoblacionalSchema = new Schema({
    id: Schema.Types.ObjectId,
    nombre: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    activo: {
        type: Boolean,
        default: true
    },
    validaciones: Schema.Types.Mixed,
    mensajeDefault: Schema.Types.Mixed
});

export const GrupoPoblacional = model('grupo-poblacional', GrupoPoblacionalSchema, 'grupo-poblacional');
