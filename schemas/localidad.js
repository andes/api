"use strict";
var mongoose = require('mongoose');
var localidadSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    provincia: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});
var localidad = mongoose.model('localidad', localidadSchema, 'localidad');
module.exports = localidad;
//# sourceMappingURL=localidad.js.map