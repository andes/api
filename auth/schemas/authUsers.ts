import * as mongoose from 'mongoose';
import { AndesDocWithAudit, AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ObjectId } from '@andes/core';

export interface IAuthUsers {
    usuario: number;
    activo: boolean;
    nombre: string;
    apellido: string;
    documento: string;
    password: string;
    foto: string;
    authMethod?: string;
    permisosGlobales: string[];
    organizaciones: {
        _id: ObjectId;
        nombre: string;
        permisos: string[];
        activo: boolean;
        perfiles: {
            _id: ObjectId;
            nombre: string;
        }[];
        lastLogin: Date;
    }[];
    lastLogin: Date;
    tipo?: String;
    validationToken?: String;
    email?: String;
    configuracion?: { [key: string]: any };
    disclaimers?: {
        _id: ObjectId;
        createdAt: Date;
    }[];
    pacienteRestringido: Object;
}

export type IAuthUsersDoc = AndesDocWithAudit<IAuthUsers>;

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
        }],
        lastLogin: Date
    }],
    lastLogin: Date,
    tipo: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    validationToken: {
        type: String,
        required: false
    },
    configuracion: {
        type: mongoose.SchemaTypes.Mixed,
        default: {}
    },
    disclaimers: [{ createdAt: Date, _id: { type: mongoose.Schema.Types.ObjectId, ref: 'dislaimer' } }],
    pacienteRestringido: {
        type: Object,
        default: null
    }
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

AuthUsersSchema.index({
    usuario: 1,
    'organizaciones._id': 1,
});
AuthUsersSchema.index({ validationToken: 1 });

export const AuthUsers = mongoose.model<IAuthUsersDoc>('authUsers', AuthUsersSchema, 'authUsers');
