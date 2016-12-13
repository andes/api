"use strict";
var mongoose = require('mongoose');
var ubicacionSchema = require('./../ubicacion');
mongoose.set('debug', true);
var espacioFisicoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    edificio: {
        id: mongoose.Schema.Types.ObjectId,
        descripcion: String,
        telefono: {
            tipo: {
                type: String,
                enum: ["", "Teléfono Fijo", "Teléfono Celular", "email"]
            },
            valor: String,
            ranking: Number,
            ultimaActualizacion: Date,
            activo: Boolean
        },
        direccion: {
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
        },
    },
    detalle: String,
    activo: Boolean
});
var espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
module.exports = espacioFisico;
//# sourceMappingURL=espacioFisico.js.map