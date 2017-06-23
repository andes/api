import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';

import { pacienteSchema } from '../../../core/mpi/schemas/paciente';

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
    password: {
        type: String,
        required: true
    },
    codigoVerificacion: {
        type: String,
        unique: true,
        required: true
    },
    // Si fue usado o no
    estadoCodigo: {
        type: Boolean,
        default: false
    },
    envioCodigoCount: Number,
    activacionApp: {
        type: Boolean,
        default: false
    }
}, {
        timestamps: true
    });

pacienteAppSchema.pre('save', function (next) {

    var user = this;
    var SALT_FACTOR = 5;

    if (!user.isModified('password')) {
        return next();
    }

    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {

        if (err) {
            return next(err);
        }

        bcrypt.hash(user.password, salt, null, function (err, hash) {

            if (err) {
                return next(err);
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

}

export let pacienteApp = mongoose.model('pacienteApp', pacienteAppSchema, 'pacienteApp');
