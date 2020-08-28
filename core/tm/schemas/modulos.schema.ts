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
    icono: String,
    linkAcceso: {
        type: String,
        required: true
    },
    permisos: [String],
    activo: {
        type: Boolean,
        default: true
    },
    orden: Number

});

export const Modulos = model('modulos_new2', ModuloSchema, 'modulos_new');
