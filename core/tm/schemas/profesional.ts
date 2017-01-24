import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';
import * as sexoSchema from './sexo';
import * as estadoCivilSchema from './estadoCivil';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as especialidadSchema from './especialidad';

var profesionalSchema = new mongoose.Schema({
    documento: String,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },  
    nombre: String,
    apellido: String,
    contacto: [contactoSchema],
    //sexo: sexoSchema,
     sexo:{
        type: String,
        enum: ["femenino", "masculino", "otro",""]
    },
    //genero: sexoSchema, // identidad autopercibida
    genero: {
        type: String,
        enum: ["femenino", "masculino", "otro",""]
    },
    fechaNacimiento: Date, // Fecha Nacimiento
    fechaFallecimiento: Date,
    direccion: [direccionSchema],
    //estadoCivil: estadoCivilSchema,
    estadoCivil:  {
        type: String,
        enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro"] 
      },
    foto: String,
    rol: String, //Ejemplo Jefe de Terapia intensiva
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
})

//Defino Virtuals
profesionalSchema.virtual('nombreCompleto').get(function() {  
    return this.nombre + ' ' + this.apellido;
});


var profesional = mongoose.model('profesional', profesionalSchema, 'profesional');
export = profesional;