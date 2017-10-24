import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';

import { pacienteSchema } from '../../../core/mpi/schemas/paciente';
import { deviceSchema } from './device';

export let pacienteAppSchema = new mongoose.Schema({

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
    codigoVerificacion: {
        type: String,
        /* unique: true, */
        /* required: true */
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

    estadoCodigo: {
        type: Boolean,
        default: false
    },
    expirationTime: {
        type: Date
    },
    envioCodigoCount: Number,
    activacionApp: {
        type: Boolean,
        default: false
    },
    permisos: [String],
    restablecerPassword: {
        codigo: String,
        fechaExpiracion: Date
    },
    devices: [deviceSchema]
    }, {
        timestamps: true
    });

pacienteAppSchema.pre('save', function (next) {

    let user = this;
    let SALT_FACTOR = 5;

    if (user.isModified()) {
        user.updatedAt = new Date();
    }

    if (!user.isModified('password')) {
        return next();
    }

    bcrypt.genSalt(SALT_FACTOR, function (errGen, salt) {

        if (errGen) {
            return next(errGen);
        }

        bcrypt.hash(user.password, salt, null, function (errCrypt, hash) {

            if (errCrypt) {
                return next(errCrypt);
            }

            user.password = hash;
            next();

        });

    });

});

pacienteAppSchema.methods.comparePassword = function (passwordAttempt, cb) {

    bcrypt.compare(passwordAttempt, this.password, function (err, isMatch) {

        if (err) {
            return cb(err);
        } else {
            cb(null, isMatch);
        }
    });
};

export let pacienteApp = mongoose.model('pacienteApp', pacienteAppSchema, 'pacienteApp');
