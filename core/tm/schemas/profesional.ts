import * as mongoose from 'mongoose';
import * as constantes from './constantes';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as especialidadSchema from './especialidad';

export let profesionalSchema = new mongoose.Schema({
    documento: String,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    nombre: String,
    apellido: String,
    contacto: [contactoSchema],
    sexo: constantes.SEXO,
    genero: constantes.SEXO,
    fechaNacimiento: Date, // Fecha Nacimiento
    fechaFallecimiento: Date,
    direccion: [direccionSchema],
    estadoCivil: constantes.ESTADOCIVIL,
    foto: String,
    rol: String, // Ejemplo Jefe de Terapia intensiva
    especialidades: [especialidadSchema],
    matriculas: [{
        numero: Number,
        descripcion: String,
        activo: Boolean,
        periodo: {
            inicio: Date,
            fin: Date
        },
    }],
    legajo: String,
    codigoSisa: String
});

// Defino Virtuals
profesionalSchema.virtual('nombreCompleto').get(function () {
    // Prefiere el error de undefined cuando se hace una consulta de proyección y no se incluyen algunos campos
    return ((this.nombre || '') + ' ' + (this.apellido || '')).trim();
});

export let profesional = mongoose.model('profesional', profesionalSchema, 'profesional');
