"use strict";
var mongoose = require('mongoose');
var edificioSchema = require('./edificio');
var direccionSchema = require('./direccion');
var contactoSchema = require('./contacto');
var tipoEstablecimientoSchema = require('./tipoEstablecimiento');
var organizacionSchema = new mongoose.Schema({
    codigo: {
        sisa: {
            type: String,
            required: true
        },
        cuie: String,
        remediar: String
    },
    nombre: String,
    tipoEstablecimiento: tipoEstablecimientoSchema,
    contacto: [contactoSchema],
    direccion: direccionSchema,
    edificio: [edificioSchema],
    nivelComplejidad: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    fechaAlta: Date,
    fechaBaja: Date
});
var organizacion = mongoose.model('organizacion', organizacionSchema, 'organizacion');
module.exports = organizacion;
//# sourceMappingURL=organizacion.js.map