import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';
import { DeviceSchema } from './device';

export interface IPacienteApp extends mongoose.Document {
    nombre: String;
    apellido: String;
    email: String;
    password: String;
    documento: String;
    telefono: String;
    sexo: String;
    genero: String;
    fechaNacimiento: String;
    pacientes: any[];
    devices: any[];
    permisos: any[];
    profesionalId: mongoose.Types.ObjectId;
    activacionApp: Boolean;
    estadoCodigo: Boolean;
    restablecerPassword: {
        fechaExpiracion: Date;
        codigo: String;
    };

    comparePassword(password: String): Promise<Boolean>;

}

export let PacienteAppSchema = new mongoose.Schema({

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
    devices: [DeviceSchema]
}, {
    timestamps: true
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
    return new Promise((resolve, reject) => {
        bcrypt.compare(passwordAttempt, this.password, (err, isMatch) => {
            if (err) {
                return reject(err);
            } else {
                return resolve(isMatch);
            }
        });
    });
};

export let PacienteApp: mongoose.Model<IPacienteApp> = mongoose.model<IPacienteApp>('pacienteApp', PacienteAppSchema, 'pacienteApp');
