"use strict";
var mongoose = require('mongoose');
var direccionSchema = require('./direccion');
var contactoSchema = require('./contacto');
var especialidadSchema = require('./especialidad');
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
    sexo: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    },
    //genero: sexoSchema, // identidad autopercibida
    genero: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    },
    fechaNacimiento: Date,
    fechaFallecimiento: Date,
    direccion: [direccionSchema],
    //estadoCivil: estadoCivilSchema,
    estadoCivil: {
        type: String,
        enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro"]
    },
    foto: String,
    rol: String,
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
});
//Defino Virtuals
profesionalSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});
var profesional = mongoose.model('profesional', profesionalSchema, 'profesional');
module.exports = profesional;
//# sourceMappingURL=profesional.js.map