"use strict";
var mongoose = require('mongoose');
var ubicacionSchema = require('./ubicacion');
var organizacionSchema = new mongoose.Schema({
    codigo: {
        sisa: {
            type: Number,
            required: true
        },
        cuie: String,
        remediar: String
    },
    nombre: String,
    tipoEstablecimiento: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    telecom: [{
            tipo: {
                type: String,
                enum: ["telefonoFijo", "telefonoCelular", "email"]
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
    //Contact for the organization for a certain purpose.
    contacto: [{
            proposito: String,
            nombre: String,
            apellido: String,
            tipo: {
                type: String,
                enum: ["telefonoFijo", "telefonoCelular", "email"]
            },
            valor: String,
            activo: Boolean
        }],
    nivelComplejidad: Number,
    activo: Boolean,
    fechaAlta: Date,
    fechaBaja: Date
});
var organizacion = mongoose.model('organizacion', organizacionSchema, 'organizacion');
module.exports = organizacion;
//# sourceMappingURL=organizacion.js.map