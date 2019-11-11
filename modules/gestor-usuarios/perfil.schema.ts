import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Schema, model } from 'mongoose';

export const PerfilSchema = new Schema({

    nombre: {
        type: String,
        required: true
    },

    permisos: {
        type: [String],
        required: true
    },

    organizacion: {
        type: Schema.Types.ObjectId,
        ref: 'organizacion',
        required: false
    },

    activo: {
        type: Boolean,
        required: true
    }

});

PerfilSchema.plugin(AuditPlugin);

export const Perfiles = model('authPerfiles', PerfilSchema, 'authPerfiles');
