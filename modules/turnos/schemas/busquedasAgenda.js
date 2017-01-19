"use strict";
var mongoose = require("mongoose");
var busquedasAgendaSchema = new mongoose.Schema({
    idPrestacion: String,
    idProfesional: String,
    fechaBusqueda: Date
});
var busquedasAgenda = mongoose.model('busquedasAgenda', busquedasAgendaSchema, 'busquedasAgenda');
module.exports = busquedasAgenda;
//# sourceMappingURL=busquedasAgenda.js.map