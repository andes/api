import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const schema = new mongoose.Schema({
    usuario: Number,
    activo: Boolean,
    nombre: String,
    apellido: String,
    password: String,
    foto: String,
    authMethod: {
        type: String,
        required: false
    },
    organizaciones: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'organizacion'
        },
        permisos: [String],
        activo: {
            type: Boolean,
            default: true
        }
    }]
});
schema.plugin(AuditPlugin);
export let authUsers = mongoose.model('authUsers', schema, 'authUsers');
