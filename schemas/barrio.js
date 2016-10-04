"use strict";
var mongoose = require('mongoose');
var barrioSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    localidad: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});
var barrio = mongoose.model('barrio', barrioSchema, 'barrio');
module.exports = barrio;
//# sourceMappingURL=barrio.js.map