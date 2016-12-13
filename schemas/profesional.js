"use strict";
var mongoose = require('mongoose');
var ubicacionSchema = require('./ubicacion');
var profesionalSchema = new mongoose.Schema({
    documento: String,
    activo: Boolean,
    nombre: String,
    apellido: String,
    contacto: [{
            tipo: {
                type: String,
                enum: ["Teléfono Fijo", "Teléfono Celular", "Email", ""]
            },
            valor: String,
            ranking: Number,
            ultimaActualizacion: Date,
            activo: Boolean
        }],
    sexo: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    },
    genero: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    },
    fechaNacimiento: Date,
    fechaFallecimiento: Date,
    direccion: [{
            valor: String,
            codigoPostal: String,
            ubicacion: ubicacionSchema,
            ranking: Number,
            geoReferencia: {
                type: [Number],
                index: '2d' // create the geospatial index
            },
            ultimaActualizacion: Date,
            activo: Boolean
        }],
    estadoCivil: {
        type: String,
        enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro", ""]
    },
    foto: String,
    rol: String,
    especialidad: [{
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        }],
    matriculas: [{
            numero: Number,
            descripcion: String,
            activo: Boolean,
            fechaInicio: Date,
            fechaVencimiento: Date
        }],
});
//Defino Virtuals
profesionalSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});
var profesional = mongoose.model('profesional', profesionalSchema, 'profesional');
module.exports = profesional;
//# sourceMappingURL=profesional.js.map