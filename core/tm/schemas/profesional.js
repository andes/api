"use strict";
var mongoose = require('mongoose');
var sexoSchema = require('./sexo');
var estadoCivilSchema = require('./estadoCivil');
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
    sexo: sexoSchema,
    genero: sexoSchema,
    fechaNacimiento: Date,
    fechaFallecimiento: Date,
    direccion: [direccionSchema],
    estadoCivil: estadoCivilSchema,
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