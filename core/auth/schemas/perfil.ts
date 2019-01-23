import { Schema, model } from 'mongoose';

const perfilSchema = new Schema({
    nombre: {
        type: String,
        required: true
    },
    permisos: {
        type: [String],
        required: true
    },
    /**
     * En organizacion está la organización donde aplica el perfil. Está para dar soporte a
     * los perfiles Locales y Globales. Si está vacío, es porque se trata de un perfil Global
     */
    organizacion: {
        type: Schema.Types.ObjectId,
        ref: 'organizacion'
    }
});

let perfil = model('perfilPermisos', perfilSchema, 'perfilPermisos');
export = perfil;

