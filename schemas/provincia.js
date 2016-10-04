"use strict";
var mongoose = require('mongoose');
var provinciaSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    pais: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});
var provincia = mongoose.model('provincia', provinciaSchema, 'provincia');
module.exports = provincia;
//# sourceMappingURL=provincia.js.map