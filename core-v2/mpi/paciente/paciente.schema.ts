import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { Matching } from '@andes/match';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ESTADO, ESTADOCIVIL, SEXO, IDENTIFICACION } from '../../../core/mpi/schemas/constantes';
import { NombreSchema, DireccionSchema, ContactoSchema } from '../../../shared/schemas';
import { FinanciadorSchema } from '../financiador/financiador.schema';
import { ParentescoSchema } from '../../../core/mpi/parentesco.schema';
import { IPacienteDoc } from './paciente.interface';


let ObjectId = mongoose.Types.ObjectId;
const mongoose_fuzzy_searching = require('mongoose-fuzzy-searching');

export const PacienteSchema: mongoose.Schema = new mongoose.Schema({
    nombre: {
        type: String,
        es_indexed: true
    },
    apellido: {
        type: String,
        es_indexed: true
    },
    fechaNacimiento: {
        type: Date,
        es_indexed: true
    },
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
    alias: String,
    estado: ESTADO,
    contacto: [ContactoSchema],
    direccion: [DireccionSchema],
    sexo: SEXO,
    genero: SEXO,
    fechaFallecimiento: Date,
    estadoCivil: ESTADOCIVIL,
    foto: {
        type: String,
        select: false
    },
    fotoMobile: String,
    nacionalidad: String,
    // ---------------------
    // Campos asociados a pacientes extranjeros

    tipoIdentificacion: { type: IDENTIFICACION, required: false },  // pasaporte o documento extranjero
    numeroIdentificacion: {
        type: String,
        required: false
    },
    // --------------------
    relaciones: [{
        relacion: ParentescoSchema,
        referencia: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'paciente'
        },
        nombre: String,
        apellido: String,
        documento: String,
        foto: String
    }],
    financiador: [FinanciadorSchema],
    claveBlocking: { type: [String], es_indexed: true },
    entidadesValidadoras: [String],
    scan: String,
    reportarError: Boolean,
    notaError: String,
    carpetaEfectores: [{
        organizacion: NombreSchema,
        nroCarpeta: String
    }],
    notas: [{
        fecha: Date,
        titulo: String,
        nota: String,
        destacada: Boolean
    }],
    tokens: [{
        type: String,
        lowercase: true
    }]
}, { versionKey: false });

PacienteSchema.pre('save', function (next) {
    const user: any = this;
    let words = [];
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
    if (user.documento) {
        words.push(user.documento.toLowerCase());
    }
    if (user.nombre) {
        user.nombre.toLowerCase().split(' ').forEach(doc => {
            words.push(doc.toLowerCase());
        });
    }
    if (user.apellido) {
        user.apellido.toLowerCase().split(' ').forEach(doc => {
            words.push(doc.toLowerCase());
        });
    }
    if (user.alias) {
        words.push(user.alias.toLowerCase());
    }
    if (user.numeroIdentificacion) {
        words.push(user.numeroIdentificacion.toLowerCase());
    }
    user.tokens = words;
    next();

});

PacienteSchema.virtual('vinculos').get(function () {
    if (this.identificadores) {
        let identificadores = this.identificadores.filter(i => i.entidad === 'ANDES').map(i => ObjectId(i.valor));
        return [this._id, ...identificadores];
    } else {
        return [this._id];
    }
});

export function calcularEdad(fecha, fechaFallecimiento) {
    let edad = null;
    if (fecha) {
        const birthDate = new Date(fecha);
        const currentDate = fechaFallecimiento ? new Date(fechaFallecimiento) : new Date();
        let years = (currentDate.getFullYear() - birthDate.getFullYear());
        if (currentDate.getMonth() < birthDate.getMonth() ||
            currentDate.getMonth() === birthDate.getMonth() && currentDate.getDate() < birthDate.getDate()) {
            years--;
        }
        edad = years;
    }
    return edad;
}

export function calcularEdadReal(fecha, fechaFallecimiento) {
    // Calcula Edad de una persona (Redondea -- 30.5 años = 30 años)
    let edad: Object;
    let fechaNac: any;
    const fechaActual: Date = fechaFallecimiento ? new Date(fechaFallecimiento) : new Date();
    let fechaAct: any;
    let difAnios: any;
    let difDias: any;
    let difMeses: any;
    let difHs: any;

    fechaNac = moment(fecha, 'YYYY-MM-DD HH:mm:ss');
    fechaAct = moment(fechaActual, 'YYYY-MM-DD HH:mm:ss');
    difDias = fechaAct.diff(fechaNac, 'd'); // Diferencia en días
    difAnios = Math.floor(difDias / 365.25);
    difMeses = Math.floor(difDias / 30.4375);
    difHs = fechaAct.diff(fechaNac, 'h'); // Diferencia en horas

    if (difAnios !== 0) {
        edad = {
            valor: difAnios,
            unidad: 'Años'
        };
    } else if (difMeses !== 0) {
        edad = {
            valor: difMeses,
            unidad: 'Meses'
        };
    } else if (difDias !== 0) {
        edad = {
            valor: difDias,
            unidad: 'Días'
        };
    } else if (difHs !== 0) {
        edad = {
            valor: difHs,
            unidad: 'Horas'
        };
    }

    return edad;
}

/* Se definen los campos virtuals */
PacienteSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});
PacienteSchema.virtual('edad').get(function () {
    return calcularEdad(this.fechaNacimiento, this.fechaFallecimiento);
});
PacienteSchema.virtual('edadReal').get(function () {
    return calcularEdadReal(this.fechaNacimiento, this.fechaFallecimiento);
});

PacienteSchema.methods.basicos = function () {
    return {
        id: this._id,
        nombre: this.nombre,
        apellido: this.apellido,
        documento: this.documento,
        fechaNacimiento: this.fechaNacimiento,
        sexo: this.sexo
    };
};

PacienteSchema.plugin(AuditPlugin);
PacienteSchema.plugin(mongoose_fuzzy_searching, {
    fields: [
        {
            name: 'documento',
            minSize: 3
        }]
});

PacienteSchema.index({ tokens: 1 });
PacienteSchema.index({ documento: 1, sexo: 1 });

export const PacienteSubSchema: mongoose.Schema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    apellido: String,
    documento: String,
    alias: String,
    fechaNacimiento: Date,
    sexo: SEXO,
    telefono: String

});

export const Paciente = mongoose.model<IPacienteDoc>('paciente_2', PacienteSchema, 'paciente');