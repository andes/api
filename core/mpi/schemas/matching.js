"use strict";
var mongoose = require("mongoose");
var ubicacionSchema = require("../../tm/schemas/ubicacion");
var matchingSchema = new mongoose.Schema({
    pacienteOriginal: {
        idPaciente: Number,
        documento: String,
        estado: {
            type: String,
            required: true,
            enum: ["temporal", "identificado", "validado", "recienNacido", "extranjero"]
        },
        nombre: String,
        apellido: String,
        contacto: [{
                tipo: {
                    type: String,
                    enum: ["Teléfono Fijo", "Teléfono Celular", "Email", ""]
                },
                valor: String,
                ranking: Number,
                ultimaActualizacion: Date,
                activo: Boolean
            }],
        direccion: [{
                valor: String,
                codigoPostal: String,
                ubicacion: ubicacionSchema,
                ranking: Number,
                geoReferencia: {
                    type: [Number],
                    index: '2d' // create the geospatial index
                },
                ultimaActualizacion: Date,
                activo: Boolean
            }],
        sexo: {
            type: String,
            enum: ["femenino", "masculino", "otro", ""]
        },
        genero: {
            type: String,
            enum: ["femenino", "masculino", "otro", ""]
        },
        fechaNacimiento: Date,
        estadoCivil: {
            type: String,
            enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro", ""]
        },
        claveSN: String
    },
    pacienteMutante: {
        idPaciente: Number,
        documento: String,
        estado: {
            type: String,
            required: true,
            enum: ["temporal", "identificado", "validado", "recienNacido", "extranjero"]
        },
        nombre: String,
        apellido: String,
        contacto: [{
                tipo: {
                    type: String,
                    enum: ["Teléfono Fijo", "Teléfono Celular", "Email", ""]
                },
                valor: String,
                ranking: Number,
                ultimaActualizacion: Date,
                activo: Boolean
            }],
        direccion: [{
                valor: String,
                codigoPostal: String,
                ubicacion: ubicacionSchema,
                ranking: Number,
                geoReferencia: {
                    type: [Number],
                    index: '2d' // create the geospatial index
                },
                ultimaActualizacion: Date,
                activo: Boolean
            }],
        sexo: {
            type: String,
            enum: ["femenino", "masculino", "otro", ""]
        },
        genero: {
            type: String,
            enum: ["femenino", "masculino", "otro", ""]
        },
        fechaNacimiento: Date,
        estadoCivil: {
            type: String,
            enum: ["casado", "separado", "divorciado", "viudo", "soltero", "otro", ""]
        },
        claveSN: String
    },
    matchNumber: Number
});
var matching = mongoose.model('matching', matchingSchema, 'matching');
module.exports = matching;
//# sourceMappingURL=matching.js.map