"use strict";
var mongoose = require('mongoose');
var ubicacionSchema = require('./ubicacion');
mongoose.set('debug', true);
var edificioSchema = new mongoose.Schema({
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
            index: '2d'
        },
        ultimaActualizacion: Date,
        activo: Boolean
    }
});
module.exports = edificioSchema;
//# sourceMappingURL=edificio.js.map