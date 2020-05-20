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
    permisos: [String]

});

export const Modulos = model('modulos', ModuloSchema, 'modulos');
