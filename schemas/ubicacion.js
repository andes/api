"use strict";
var mongoose = require('mongoose');
var ubicacionSchema = new mongoose.Schema({
    barrio: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    localidad: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    provincia: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    pais: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});
module.exports = ubicacionSchema;
//# sourceMappingURL=ubicacion.js.map