import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const AuthUsersSchema = new mongoose.Schema({
    usuario: Number,
    activo: Boolean,
    nombre: String,
    apellido: String,
    documento: String,
    password: String,
    foto: String,
    authMethod: {
        type: String,
        required: false
    },
    permisosGlobales: [String],
    organizaciones: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'organizacion'
        },
        nombre: String,
        permisos: [String],
        activo: {
            type: Boolean,
            default: true
        },
        perfiles: [{
            _id: mongoose.Schema.Types.ObjectId,
            nombre: String
        }]
    }],
    lastLogin: Date,
    configuracion: {
        type: mongoose.SchemaTypes.Mixed,
        default: {}
    },
    disclaimers: [{ createdAt: Date, _id: { type: mongoose.Schema.Types.ObjectId, ref: 'dislaimer' } }],
});
AuthUsersSchema.plugin(AuditPlugin);

export let AuthUsers = mongoose.model('authUsers', AuthUsersSchema, 'authUsers');
