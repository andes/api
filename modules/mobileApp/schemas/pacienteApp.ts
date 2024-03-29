import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';
import { DeviceSchema } from './device';
import { ObjectId } from '@andes/core';
import { AndesDoc } from '@andes/mongoose-plugin-audit';

export interface IPacienteApp {
    nombre: string;
    apellido: string;
    email: string;
    usuario: string;
    documento: string;
    nacionalidad: string;
    sexo: string;
    genero: string;
    fechaNacimiento: Date;
    telefono: string;
    password: string;
    lastLogin: Date;
    pacientes?: {
        id: ObjectId;
        relacion: 'principal' | 'pariente';
        addAt: Date;
    }[];
    profesionalId: ObjectId;
    activacionApp: boolean;
    permisos: string[];
    restablecerPassword?: {
        codigo: string;
        fechaExpiracion: Date;
    };
    devices: any[];
}

export type IPacienteAppDoc = AndesDoc<IPacienteApp> & {
    comparePassword(password: string, cb: Function);
};


export const PacienteAppSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    usuario: {
        type: String
    },
    documento: {
        type: String
    },
    nacionalidad: {
        type: String
    },
    sexo: {
        type: String
    },
    genero: {
        type: String
    },
    fechaNacimiento: {
        type: Date
    },
    telefono: {
        type: String
    },
    password: {
        type: String
        // required: true
    },
    lastLogin: {
        type: Date
    },
    // Si fue usado o no
    pacientes: [
        {
            id: mongoose.Schema.Types.ObjectId,
            relacion: {
                type: String,
                enum: ['principal', 'pariente'],
                default: 'principal'
            },
            addedAt: Date
        }
    ],

    profesionalId: mongoose.Schema.Types.ObjectId,

    activacionApp: {
        type: Boolean,
        default: false
    },
    permisos: [String],
    restablecerPassword: {
        codigo: String,
        fechaExpiracion: Date
    },
    devices: [DeviceSchema],
}, { timestamps: true });

PacienteAppSchema.index({
    'pacientes.id': 1
});
PacienteAppSchema.index({
    email: 1,
});
PacienteAppSchema.index({
    documento: 1,
});
PacienteAppSchema.index({
    profesionalId: 1
});

PacienteAppSchema.pre('save', function (next) {

    const user: any = this;
    const SALT_FACTOR = 5;

    if (user.isModified()) {
        user.updatedAt = new Date();
    }

    if (!user.isModified('password')) {
        return next();
    }

    bcrypt.genSalt(SALT_FACTOR, (errGen, salt) => {

        if (errGen) {
            return next(errGen);
        }

        bcrypt.hash(user.password, salt, null, (errCrypt, hash) => {

            if (errCrypt) {
                return next(errCrypt);
            }

            user.password = hash;
            next();

        });

    });

});

PacienteAppSchema.methods.comparePassword = function (passwordAttempt, cb) {

    bcrypt.compare(passwordAttempt, this.password, (err, isMatch) => {

        if (err) {
            return cb(err);
        } else {
            cb(null, isMatch);
        }
    });
};

export const PacienteApp = mongoose.model<IPacienteAppDoc>('pacienteApp', PacienteAppSchema, 'pacienteApp');
