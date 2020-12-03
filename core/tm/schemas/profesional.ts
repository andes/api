import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import { ObjSIISASchema, EspecialidadSIISASchema } from './siisa';

const matriculacionSchema = new mongoose.Schema({
    matriculaNumero: { type: Number, required: false },
    libro: { type: String, required: false },
    folio: { type: String, required: false },
    inicio: Date,
    baja: {
        motivo: { type: String, required: false },
        fecha: { type: String, required: false }
    },
    notificacionVencimiento: { type: Boolean, required: false },
    fin: Date,
    revalidacionNumero: Number
});
export const ProfesionalSchema = new mongoose.Schema({
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
    contactos: [contactoSchema],
    domicilios: [direccionSchema],
    validadoRenaper: { type: Boolean, default: false },
    foto: { type: String, required: false },
    fotoArchivo: { type: String, required: false },
    firmas: [{
        imgArchivo: { type: String, required: false },
        fecha: { type: String, required: false },
    }],
    incluidoSuperintendencia: { type: Boolean, default: false },
    formacionGrado: [{
        profesion: { type: ObjSIISASchema, required: false },
        entidadFormadora: { type: ObjSIISASchema, required: false },
        titulo: { type: String, required: false },
        tituloFileId: { type: String, required: false },
        fechaTitulo: { type: Date, required: false },
        fechaEgreso: { type: Date, required: false },
        renovacion: { type: Boolean, default: false },
        papelesVerificados: { type: Boolean, default: false },
        matriculacion: [matriculacionSchema],
        matriculado: { type: Boolean, default: false },
        exportadoSisa: Boolean,
        fechaDeInscripcion: Date
    }],
    formacionPosgrado: [{
        profesion: { type: ObjSIISASchema, required: false },
        institucionFormadora: { type: ObjSIISASchema, required: false },
        especialidad: { type: EspecialidadSIISASchema, required: false },
        fechaIngreso: { type: Date, required: false },
        fechaEgreso: { type: Date, required: false },
        tituloFileId: { type: String, required: false },
        observacion: String,
        certificacion: {
            fecha: { type: Date, required: false },
            modalidad: { type: ObjSIISASchema, required: false },
            establecimiento: { type: ObjSIISASchema, required: false },
        },
        matriculacion: [{
            matriculaNumero: { type: Number, required: false },
            libro: { type: String, required: false },
            folio: { type: String, required: false },
            inicio: Date,
            baja: {
                motivo: { type: String, required: false },
                fecha: { type: String, required: false }
            },
            notificacionVencimiento: { type: Boolean, required: false },
            fin: Date,
            revalidacionNumero: Number
        }],
        fechasDeAltas: [{ fecha: { type: Date, required: false } }],
        matriculado: { type: Boolean, default: false },
        revalida: { type: Boolean, default: false },
        papelesVerificados: { type: Boolean, default: false },
        exportadoSisa: Boolean,
        tieneVencimiento: Boolean,
        notas: [{ type: String, required: false }]
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
    rematriculado: { type: Number, default: false },
    agenteMatriculador: { type: String, required: false },
    supervisor: {
        id: String,
        nombreCompleto: String,
    },
    OtrosDatos: [{
        matriculaProvincial: { type: Number, required: false },
        folio: { type: String, required: false },
        libro: { type: String, required: false },
        anio: { type: Number, required: false }
    }],
    idRenovacion: { type: String, required: false },
    documentoViejo: { type: Number, required: false },
    turno: Date,
    profesionalMatriculado: { type: Boolean, default: true },
    /* externa significa que no son matriculados con la app de matriculaciones como pueden ser los psicólogos, kinesiólogos, etc
    */
    profesionExterna: { type: ObjSIISASchema, required: false },
    matriculaExterna: { type: String, required: false }
});


// Virtuals
ProfesionalSchema.virtual('nombreCompleto').get(function () {
    return this.apellido + ', ' + this.nombre;

});
ProfesionalSchema.virtual('fallecido').get(function () {
    return this.fechaFallecimiento;
});

ProfesionalSchema.plugin(AuditPlugin);

ProfesionalSchema.index({ documento: 1 });

ProfesionalSchema.index({
    apellido: 1,
    nombre: 1
});

export const Profesional = mongoose.model('profesional', ProfesionalSchema, 'profesional');
