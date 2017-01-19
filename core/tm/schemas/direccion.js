"use strict";
var mongoose = require("mongoose");
var ubicacionSchema = require("./ubicacion");
var schema = new mongoose.Schema({
    valor: String,
    codigoPostal: String,
    ubicacion: ubicacionSchema,
    geoReferencia: {
        type: [Number],
        index: '2d'
    },
    ranking: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    // REVISAR
    ultimaActualizacion: Date,
});
module.exports = schema;
//# sourceMappingURL=direccion.js.map