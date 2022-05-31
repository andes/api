import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { Matching } from '@andes/match';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ESTADO, ESTADOCIVIL, SEXO, IDENTIFICACION } from './constantes';
import { NombreSchema, DireccionSchema, ContactoSchema, NombreSchemaV2 } from '../../../shared/schemas';
import { FinanciadorSchema } from '../financiador/financiador.schema';
import { ParentescoSchema } from '../parentesco/parentesco.schema';
import { IPacienteDoc } from './paciente.interface';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as obraSocialSchema from '../../../modules/obraSocial/schemas/obraSocial';

const ObjectId = mongoose.Types.ObjectId;
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
    lugarNacimiento: {
        localidad: { type: NombreSchema },
        provincia: { type: NombreSchema },
        pais: { type: NombreSchema },
        lugar: { type: String }
    },
    sexo: SEXO,
    genero: SEXO,
    fechaFallecimiento: Date,
    estadoCivil: ESTADOCIVIL,
    fotoId: mongoose.Schema.Types.ObjectId,
    foto: {
        type: String,
        select: false
    },
    fotoMobile: String,
    nacionalidad: String,
    // ---------------------
    // Campos asociados a pacientes extranjeros

    tipoIdentificacion: IDENTIFICACION, // pasaporte o documento extranjero
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
        fechaNacimiento: Date,
        fechaFallecimiento: Date,
        numeroIdentificacion: String,
        fotoId: mongoose.Schema.Types.ObjectId,
        activo: Boolean
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
    }],
    validateAt: Date,
    documentos: [{
        fecha: Date,
        archivos: [{
            ext: String, id: String
        }],
        tipo: {
            id: String,
            label: String
        }
    }],
    idPacientePrincipal: mongoose.Schema.Types.ObjectId
}, { versionKey: false });


export const PacienteSubSchema: mongoose.Schema = new mongoose.Schema({
    id: ObjectId,
    nombre: String,
    apellido: String,
    documento: String,
    fechaNacimiento: Date,
    sexo: SEXO,
    genero: String,
    fechaFallecimiento: Date,
    numeroIdentificacion: String,
    alias: String,
    //  -------- extras -----------
    telefono: String,
    email: String,
    carpetaEfectores: [{
        organizacion: nombreSchema,
        nroCarpeta: String
    }],
    obraSocial: { type: obraSocialSchema },
    localidad: NombreSchemaV2,
    zona: NombreSchemaV2,
    areaPrograma: NombreSchemaV2,
    addAt: Date


}, { _id: false });


PacienteSchema.pre('save', function (next) {
    const user: any = this;
    const words = [];
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
    if (user.isModified('alias') && user.alias) {
        user.alias = user.alias.toUpperCase();
    }
    if (user.documento) {
        words.push(user.documento.toLowerCase());
    }
    if (user.nombre) {
        user.nombre.toLowerCase().split(' ').forEach(doc => {
            if (doc.length > 0) {
                words.push(doc.toLowerCase());
            }
        });
    }
    if (user.apellido) {
        user.apellido.toLowerCase().split(' ').forEach(doc => {
            if (doc.length > 0) {
                words.push(doc.toLowerCase());
            }
        });
    }
    if (user.alias) {
        user.alias.toLowerCase().split(' ').forEach(doc => {
            if (doc.length > 0) {
                words.push(doc.toLowerCase());
            }
        });
    }
    if (user.numeroIdentificacion) {
        words.push(user.numeroIdentificacion.toLowerCase());
    }
    user.tokens = words.map(replaceChars);
    next();

});

PacienteSchema.virtual('vinculos').get(function () {
    if (this.identificadores) {
        const identificadores = this.identificadores.filter(i => i.entidad === 'ANDES').map(i => ObjectId(i.valor));
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
    const fechaActual: Date = fechaFallecimiento ? new Date(fechaFallecimiento) : new Date();

    const fechaNac = moment(fecha, 'YYYY-MM-DD HH:mm:ss');
    const fechaAct = moment(fechaActual, 'YYYY-MM-DD HH:mm:ss');
    const difDias = fechaAct.diff(fechaNac, 'd'); // Diferencia en días
    const difAnios = Math.floor(difDias / 365.25);
    const difMeses = Math.floor(difDias / 30.4375);
    const difHs = fechaAct.diff(fechaNac, 'h'); // Diferencia en horas

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
    return this.apellido + ', ' + (this.alias || this.nombre);
});
PacienteSchema.virtual('edad').get(function () {
    return calcularEdad(this.fechaNacimiento, this.fechaFallecimiento);
});
PacienteSchema.virtual('edadReal').get(function () {
    return calcularEdadReal(this.fechaNacimiento, this.fechaFallecimiento);
});

PacienteSubSchema.virtual('nombreCompleto').get(function () {
    return this.apellido + ', ' + (this.alias || this.nombre);
});
PacienteSubSchema.virtual('edad').get(function () {
    return calcularEdad(this.fechaNacimiento, this.fechaFallecimiento);
});
PacienteSubSchema.virtual('edadReal').get(function () {
    return calcularEdadReal(this.fechaNacimiento, this.fechaFallecimiento);
});

PacienteSchema.methods.basicos = function () {
    return {
        id: this._id,
        nombre: this.nombre,
        alias: this.alias,
        apellido: this.apellido,
        documento: this.documento,
        numeroIdentificacion: this.numeroIdentificacion,
        fechaNacimiento: this.fechaNacimiento,
        sexo: this.sexo,
        genero: this.genero
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
PacienteSchema.index({ estado: 1, activo: 1, updateAt: 1 });

export const Paciente = mongoose.model<IPacienteDoc>('paciente_2', PacienteSchema, 'paciente');

export function replaceChars(text: string) {
    text = text.replace(/á/gi, 'a');
    text = text.replace(/é/gi, 'e');
    text = text.replace(/í/gi, 'i');
    text = text.replace(/ó/gi, 'o');
    text = text.replace(/ú/gi, 'u');
    text = text.replace(/ü/gi, 'u');
    text = text.replace(/ñ/gi, 'n');
    return text;
}
