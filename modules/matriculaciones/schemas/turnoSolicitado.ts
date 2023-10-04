import * as mongoose from 'mongoose';
import { ESTADOCIVIL } from '../../../shared/constantes';
import * as contactoSchema from '../../../core/tm/schemas/contacto';
import { EspecialidadSIISASchema, ObjSIISASchema } from '../../../core/tm/schemas/siisa';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const matriculacionSchema = new mongoose.Schema({
    matriculaNumero: { type: Number, required: false },
    libro: { type: String, required: false },
    folio: { type: String, required: false },
    inicio: Date,
    fin: Date,
    revalidacionNumero: Number
});

const nombreSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: false
    }
});

const ubicacionSchema = new mongoose.Schema({
    barrio: nombreSchema,
    localidad: nombreSchema,
    provincia: nombreSchema,
    pais: nombreSchema
});

const direccionSchema = new mongoose.Schema({
    tipo: {
        type: String,
        required: false
    },
    valor: String,
    codigoPostal: String,
    ubicacion: ubicacionSchema,
    geoReferencia: {
        type: [Number]
    },
    ranking: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    ultimaActualizacion: Date,
});


export const turnoSolicitadoSchema = new mongoose.Schema({
    // Persona
    habilitado: { type: Boolean, default: true },
    nombre: { type: String, required: false },
    apellido: { type: String, required: false },
    tipoDocumento: { type: String, required: false },
    documento: { type: String, required: false },
    documentoVencimiento: { type: Date, required: false },
    cuit: { type: String, required: false },
    fechaNacimiento: { type: Date, required: false },
    lugarNacimiento: { type: String, required: false },
    fechaFallecimiento: { type: Date, required: false },
    nacionalidad: { type: ObjSIISASchema, required: false },
    sexo: { type: String, required: false },
    estadoCivil: ESTADOCIVIL,
    contactos: [contactoSchema],
    domicilios: [direccionSchema],
    fotoArchivo: { type: String, required: false },
    firmas: [{
        imgArchivo: { type: String, required: false },
        fecha: { type: String, required: false },
    }],
    incluidoSuperintendencia: { type: Boolean, default: false },
    // Formacion
    formacionGrado: [{
        profesion: { type: ObjSIISASchema, required: false },
        entidadFormadora: { type: ObjSIISASchema, required: false },
        titulo: { type: String, required: false },
        fechaTitulo: { type: Date, required: false },
        renovacion: { type: Boolean, default: false },
        fechaEgreso: { type: Date, required: false },
        papelesVerificados: { type: Boolean, default: false },
        revalida: { type: Boolean, default: false },
        matriculacion: [matriculacionSchema]
    }],
    formacionPosgrado: [{
        profesion: { type: ObjSIISASchema, required: false },
        institucionFormadora: { type: ObjSIISASchema, required: false },
        especialidad: { type: EspecialidadSIISASchema, required: false },
        fechaIngreso: { type: Date, required: false },
        fechaEgreso: { type: Date, required: false },
        observacion: String,
        certificacion: {
            fecha: { type: Date, required: false },
            modalidad: { type: ObjSIISASchema, required: false },
            establecimiento: { type: ObjSIISASchema, required: false },
        },
        matriculacion: [matriculacionSchema]
    }],
    sanciones: [{
        numero: { type: Number, required: false },
        sancion: {
            id: Number,
            nombre: String,
        },
        motivo: { type: String, required: false },
        normaLegal: { type: String, required: false },
        fecha: { type: Date, required: false },
        vencimiento: { type: Date, required: false }
    }],
    notas: [{ type: String, required: false }],
    rematriculado: { type: Boolean, default: false },
    agenteMatriculador: { type: String, required: false },
    OtrosDatos: [{
        matriculaProvincial: { type: Number, required: false },
        folio: { type: String, required: false },
        libro: { type: String, required: false },
        anio: { type: Number, required: false }
    }],
    idRenovacion: { type: String, required: false },
    documentoViejo: { type: Number, required: false }

});


// Virtuals
turnoSolicitadoSchema.virtual('nombreCompleto').get(function () {
    return this.apellido + ', ' + this.nombre;

});

turnoSolicitadoSchema.virtual('fallecido').get(function () {
    return this.fechaFallecimiento;
});

turnoSolicitadoSchema.plugin(AuditPlugin);
export const turnoSolicitado = mongoose.model('turnoSolicitado', turnoSolicitadoSchema, 'turnoSolicitado');
