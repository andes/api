"use strict";
var mongoose = require('mongoose');
var consultorioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String
});
var consultorio = mongoose.model('consultorio', consultorioSchema, 'consultorio');
module.exports = consultorio;
//# sourceMappingURL=consultorio.js.map