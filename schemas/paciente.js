"use strict";
var mongoose = require('mongoose');
var ubicacionSchema = require('./ubicacion');
var pacienteSchema = new mongoose.Schema({
    documento: String,
    activo: Boolean,
    estado: {
        type: String,
        required: true,
        enum: ["temporal", "identificado", "validado", "recienNacido", "extranjero"]
    },
    nombre: String,
    apellido: String,
    alias: String,
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
    estadoCivil: {
        type: String,
        enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro", ""]
    },
    foto: String,
    relaciones: [{
            relacion: {
                type: String,
                enum: ["padre", "madre", "hijo", "hermano", "tutor", ""]
            },
            referencia: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'paciente'
            },
            nombre: String,
            apellido: String,
            documento: String
        }],
    financiador: [{
            entidad: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            },
            codigo: String,
            activo: Boolean,
            fechaAlta: Date,
            fechaBaja: Date,
            ranking: Number,
        }]
});
//Defino Virtuals
pacienteSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});
//Creo un indice para fulltext Search
pacienteSchema.index({
    '$**': 'text'
});
var paciente = mongoose.model('paciente', pacienteSchema, 'paciente');
module.exports = paciente;
//# sourceMappingURL=paciente.js.map