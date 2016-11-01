"use strict";
var mongoose = require('mongoose');
var configPrestacionSchema = new mongoose.Schema({
    prestacion: {
        // type: lugarSchema,//genera un _id con otro id por eso no quedo asi
        type: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },
        required: true
    },
    deldiaAccesoDirecto: {
        type: Boolean,
        default: false
    },
    deldiaAdmision: {
        type: Boolean,
        default: false
    },
    deldiaSeguimiento: {
        type: Boolean,
        default: false
    },
    deldiaAutocitado: {
        type: Boolean,
        default: false
    },
    programadosAccesoDirecto: {
        type: Boolean,
        default: false
    },
    programadosAdmision: {
        type: Boolean,
        default: false
    },
    programadosSeguimiento: {
        type: Boolean,
        default: false
    },
    programadosAutocitado: {
        type: Boolean,
        default: false
    },
    demandaAccesoDirecto: {
        type: Boolean,
        default: false
    },
    demandaAdmision: {
        type: Boolean,
        default: false
    },
    demandaSeguimiento: {
        type: Boolean,
        default: false
    },
    demandaAutocitado: {
        type: Boolean,
        default: false
    }
});
var configPrestacion = mongoose.model('formato', configPrestacionSchema, 'configPrestacion');
module.exports = configPrestacion;
//# sourceMappingURL=configPrestacion.js.map