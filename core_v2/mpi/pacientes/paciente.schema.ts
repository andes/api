import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { ESTADO, ESTADOCIVIL, SEXO, IDENTIFICACION } from '../../../shared/schemas/constantes';
import { NombreSchema, DireccionSchema, ContactoSchema } from '../../../shared/schemas';
import { FinanciadorSchema } from '../financiador/financiador.schema';
import { ParentescoSchema } from '../parentesco';
import { Matching } from '@andes/match';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { IPacienteDoc } from './paciente.interface';

const ObjectId = mongoose.Types.ObjectId;

export const PacienteSchema: mongoose.Schema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    fechaNacimiento: {
        type: Date,
        required: true
    },
    identificadores: [{
        _id: false,
        entidad: String,
        valor: String
    }],
    documento: String,
    certificadoRenaper: String,
    cuil: String,
    activo: Boolean,
    estado: ESTADO,
    alias: String,
    contacto: [ContactoSchema],
    direccion: [DireccionSchema],
    sexo: SEXO,
    genero: SEXO,
    fechaFallecimiento: Date,
    estadoCivil: ESTADOCIVIL,
    foto: String,
    fotoMobile: String,
    nacionalidad: String,
    // ---------------------
    // Campos asociados a pacientes extranjeros

    tipoIdentificacion: {
        type: IDENTIFICACION,
        required: false
    },  // pasaporte o documento extranjero
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
    claveBlocking: [String],
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
        nota: String,
        destacada: Boolean
    }]
}, { versionKey: false });

PacienteSchema.pre('save', function (next) {
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

PacienteSchema.virtual('vinculos').get(function () {
    if (this.identificadores) {
        let identificadores = this.identificadores.filter(i => i.entidad === 'ANDES').map((i: any) => {
            return ObjectId(i.valor);
        });
        return [this._id, ...identificadores];
    } else {
        return [this._id];
    }
});

/* Se definen los campos virtuals */
PacienteSchema.virtual('nombreCompleto').get(function () {
    if (this.nombre && this.apellido) {
        return this.nombre + ' ' + this.apellido;
    } else {
        return null;
    }
});

PacienteSchema.virtual('edad').get(function () {
    let edad = null;
    if (this.fechaNacimiento) {
        const birthDate = new Date(this.fechaNacimiento);
        const currentDate = new Date();
        let years = (currentDate.getFullYear() - birthDate.getFullYear());
        if (currentDate.getMonth() < birthDate.getMonth() ||
            currentDate.getMonth() === birthDate.getMonth() && currentDate.getDate() < birthDate.getDate()) {
            years--;
        }
        edad = years;
    }
    return edad;
});

PacienteSchema.virtual('edadReal').get(function () {
    // Calcula Edad de una persona (Redondea -- 30.5 años = 30 años)
    if (!this.fechaNacimiento) {
        return null;
    }
    let edad: Object;
    let fechaNac: any;
    const fechaActual: Date = new Date();
    let fechaAct: any;
    let difAnios: any;
    let difDias: any;
    let difMeses: any;
    let difHs: any;

    fechaNac = moment(this.fechaNacimiento, 'YYYY-MM-DD HH:mm:ss');
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

PacienteSchema.methods.sincroniza = function () {
    const campos = this.modifiedPaths();
    if (campos) {
        return campos.some(f => (elasticFields.indexOf(f) >= 0));
    }
};

PacienteSchema.methods.toElastic = function () {
    return {
        id: this._id,
        documento: this.documento,
        sexo: this.sexo,
        nombre: this.nombre,
        apellido: this.apellido,
        fechaNacimiento: this.fechaNacimiento,
        alias: this.alias,
        foto: this.foto,
        claveBlocking: this.claveBlocking,
        estado: this.estado,
        activo: this.activo
    };
};

// Habilitar plugin de auditoría
PacienteSchema.plugin(AuditPlugin);

// [TODO]: ver carpetas Efectores y obra sociales
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

export const elasticFields = ['id', 'documento', 'nombre', 'apellido', 'fechaNacimiento', 'alias', 'sexo', 'foto', 'claveBlocking', 'estado', 'activo'];
export const Paciente = mongoose.model<IPacienteDoc>('paciente_2', PacienteSchema, 'paciente');
