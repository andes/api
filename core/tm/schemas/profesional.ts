import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';
import * as constantes from './constantes';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as especialidadSchema from './especialidad';
import * as paisSchema from './pais';
import * as profesionSchema from './profesion';
import { ObjSIISASchema } from './siisa';

let matriculacionSchema = new mongoose.Schema({
    matriculaNumero: { type: Number, required: true },
    libro: { type: String, required: false },
    folio: { type: String, required: false },
    inicio: Date,
    fin: Date,
    revalidacionNumero: Number
});


export let profesionalSchema = new mongoose.Schema({
	// Persona
    habilitado: { type: Boolean, default: true },
    nombre: { type: String, required: false },
    apellido: { type: String, required: false },
    documentoNumero: { type: String, required: false },
    documentoVencimiento: { type: Date, required: false },
    cuit: { type: String, required: false },
    fechaNacimiento: { type: Date, required: false },
    lugarNacimiento: { type: String, required: false },
    fechaFallecimiento: { type: Date, required: false },
    nacionalidad: { type: ObjSIISASchema, required: false },
    sexo: { type: ObjSIISASchema, required: false },
    estadoCivil: constantes.ESTADOCIVIL,
    contactos: [contactoSchema],
    domicilios: [direccionSchema],
    fotoArchivo: { type: String, required: false },
    firmas: [{
        imgArchivo: { type: String, required: false },
        fecha: { type: String, required: false },
    }],
	// ??
    incluidoSuperintendencia: { type: Boolean, default: false },
	// Formacion
    formacionGrado: [{
        profesion: { type: ObjSIISASchema, required: false },
        entidadFormadora: { type: ObjSIISASchema, required: false },
        titulo: { type: String, required: false },
        fechaTitulo: { type: Date, required: false },
        revalida: { type: Boolean, default: false },
        matriculacion: [matriculacionSchema]
    }],
    formacionPosgrado: [{
         profesion: { type: ObjSIISASchema, required: false },
         institucionFormadora: { type: ObjSIISASchema, required: false },
         especialidad: { type: ObjSIISASchema, required: false },
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
    // origen: {
    //     type: String,
    //     enum: ['matriculación', 'rrhh', 'colegio de psicólogos']
    // },
    sanciones: [{
         numero: {type: Number, required: false},
         sancion: {
            id: Number,
            nombre: String,
        },
        motivo: {type: String, required: false},
        normaLegal: {type: String, required: false},
         fecha: {type: Date, required: false},
         vencimiento: {type: Date, required: false}
     }],
     notas: { type: String, required: false },
});


// Virtuals
profesionalSchema.virtual('nombreCompleto').get(function() {
    return this.apellido + ', ' + this.nombre;

});

profesionalSchema.virtual('edad').get(function() {
    let ageDifMs = Date.now() - this.fechaNacimiento.getTime();
    let ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
});

profesionalSchema.virtual('fallecido').get(function() {
    return this.fechaFallecimiento;
});

profesionalSchema.virtual('ultimaFirma').get(function() {
    return this.firmas.sort((a, b) => {
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    })[0];
});

export let profesional = mongoose.model('profesionalM', profesionalSchema, 'profesionalM');
