"use strict";
var mongoose = require('mongoose');
var provinciaSchema = new mongoose.Schema({
    nombre: String,
    localidades: [{
            nombre: String,
            codigoPostal: String
        }]
});
var provincia = mongoose.model('provincia', provinciaSchema, 'provincia');
module.exports = provincia;
//# sourceMappingURL=provincia.js.map