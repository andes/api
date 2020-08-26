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

AuthUsersSchema.pre('save', function (next) {
    const user: any = this;
    user.organizaciones = user.organizaciones.sort(
        (a, b) => {
            if (a.nombre > b.nombre) {
                return 1;
            }
            if (a.nombre < b.nombre) {
                return -1;
            }
            return 0;
        }
    );
    next();
});

AuthUsersSchema.plugin(AuditPlugin);

export let AuthUsers = mongoose.model('authUsers', AuthUsersSchema, 'authUsers');
