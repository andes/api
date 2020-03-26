import { parentescoSchema } from '../parentesco.schema';
import * as mongoose from 'mongoose';
import * as direccionSchema from '../../tm/schemas/direccion';
import * as contactoSchema from '../../tm/schemas/contacto';
import * as financiadorSchema from './financiador';
import * as constantes from './constantes';
import * as moment from 'moment';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

import * as pac from '../controller/paciente';

import { Matching } from '@andes/match';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

let ObjectId = mongoose.Types.ObjectId;
/*
interface IUserModel extends mongoose.Document {
    nombre: String;
    apellido: String;
    claveBlocking: string[];
}
*/

export let pacienteSchema: mongoose.Schema = new mongoose.Schema({
    /*
    * Información de los IDs de los pacientes en otros sistemas y también la información
    * de los pacientes vinculados. La vinculación es unilateral.
    */
    identificadores: [{
        _id: false,
        entidad: String,
        valor: String
    }],
    documento: {
        type: String,
        es_indexed: true
    },
    certificadoRenaper: String,
    cuil: {
        type: String,
        es_indexed: true
    },
    activo: Boolean,
    estado: constantes.ESTADO,
    nombre: {
        type: String,
        es_indexed: true
    },
    apellido: {
        type: String,
        es_indexed: true
    },
    alias: String,
    contacto: [contactoSchema],
    direccion: [direccionSchema],
    sexo: constantes.SEXO,
    genero: constantes.SEXO,
    fechaNacimiento: {
        type: Date,
        es_indexed: true
    },
    fechaFallecimiento: Date,
    estadoCivil: constantes.ESTADOCIVIL,
    foto: String,
    fotoMobile: String,
    nacionalidad: String,
    // ---------------------
    // Campos asociados a pacientes extranjeros

    tipoIdentificacion: { type: constantes.IDENTIFICACION, required: false },  // pasaporte o documento extranjero
    numeroIdentificacion: String,
    // --------------------
    relaciones: [{
        relacion: parentescoSchema,
        referencia: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'paciente'
        },
        nombre: String,
        apellido: String,
        documento: String,
        foto: String
    }],
    financiador: [financiadorSchema],
    claveBlocking: { type: [String], es_indexed: true },
    entidadesValidadoras: [String],
    scan: {
        type: String,
        es_indexed: true
    },
    reportarError: Boolean,
    notaError: String,
    carpetaEfectores: [{
        organizacion: nombreSchema,
        nroCarpeta: String
    }],
    notas: [{
        fecha: Date,
        nota: String,
        destacada: Boolean
    }]
}, { versionKey: false });

pacienteSchema.pre('save', function (next) {
    const user: any = this;
    if (user.isModified('nombre')) {
        user.nombre = user.nombre.toUpperCase();
    }
    if (user.isModified('apellido')) {
        user.apellido = user.apellido.toUpperCase();
    }
    if (user.isModified('nombre') || user.isModified('apellido') || user.isModified('documento')) {
        const match = new Matching();
        user.claveBlocking = match.crearClavesBlocking(user);
    }
    next();

});

pacienteSchema.virtual('vinculos').get(function () {
    if (this.identificadores) {
        let identificadores = this.identificadores.filter(i => i.entidad === 'ANDES').map(i => ObjectId(i.valor));
        return [this._id, ...identificadores];
    } else {
        return [this._id];
    }
});

/* Se definen los campos virtuals */
pacienteSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});
pacienteSchema.virtual('edad').get(function () {
    return pac.calcularEdad(this.fechaNacimiento);
});
pacienteSchema.virtual('edadReal').get(function () {
    // Calcula Edad de una persona (Redondea -- 30.5 años = 30 años)
    return pac.edadReal(this.fechaNacimiento);
});

pacienteSchema.methods.basicos = function () {
    return {
        id: this._id,
        nombre: this.nombre,
        apellido: this.apellido,
        documento: this.documento,
        fechaNacimiento: this.fechaNacimiento,
        sexo: this.sexo
    };
};

pacienteSchema.plugin(AuditPlugin);

export let paciente = mongoose.model('paciente', pacienteSchema, 'paciente');
