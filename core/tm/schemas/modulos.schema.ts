import { Schema, model } from 'mongoose';

export const ModuloSchema = new Schema({
    id: Schema.Types.ObjectId,
    nombre: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    subtitulo: String,
    color: String,
    permisos: [String],
    activo: {
        type: Boolean,
        default: true
    },
    orden: Number,
    submodulos: [
        {
            activo: { type: Boolean, default: true },
            nombre: String,
            linkAcceso: String,
            color: String,
            icono: String,
            orden: Number,
        }
    ]

});

export const Modulos = model('modulos', ModuloSchema, 'modulos');
