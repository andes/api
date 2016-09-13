"use strict";
var mongoose = require('mongoose');
var profesionalSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    apellido: String,
    tipoDni: String,
    numeroDni: Number,
    fechaNacimiento: Date,
    domicilio: {
        calle: String,
        numero: Number,
        localidad: {
            nombre: String,
            codigoPostal: String
        },
        provincia: String,
    },
    telefono: String,
    email: String,
    matriculas: [{
            numero: Number,
            descripcion: String,
            fechaInicio: Date,
            fechaVencimiento: Date,
            vigente: Boolean
        }],
    habilitado: Boolean,
    fechaBaja: Date
});
var profesional = mongoose.model('profesional', profesionalSchema, 'profesional');
module.exports = profesional;
//# sourceMappingURL=profesional.js.map