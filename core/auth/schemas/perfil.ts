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
    },
    /* Para saber si está habilitado el perfil para usarse */
    activo: {
        type: Boolean,
        required: true
    }
});

const perfil = model('perfilPermisos', perfilSchema, 'perfilPermisos');
export = perfil;
