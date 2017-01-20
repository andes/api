"use strict";
var mongoose = require('mongoose');
var mongoosastic = require('mongoosastic');
<<<<<<< HEAD
var direccionSchema = require('../../tm/schemas/direccion');
var contactoSchema = require('../../tm/schemas/contacto');
var config = require('../../../config');
=======
var ubicacionSchema = require('../../tm/schemas/ubicacion');
>>>>>>> 48a570be59f8d5efeb4b0f781d3fcfeec33bee00
var pacienteSchema = new mongoose.Schema({
    identificadores: [{
            entidad: String,
            valor: String
        }],
    documento: {
        type: String,
        es_indexed: true
    },
    activo: Boolean,
    estado: {
        type: String,
        required: true,
        enum: ["temporal", "validado", "recienNacido", "extranjero"],
        es_indexed: true
    },
    nombre: {
        type: String,
        es_indexed: true
    },
    apellido: {
        type: String,
        es_indexed: true
    },
    alias: String,
    contacto: [contactoSchema],
    direccion: [direccionSchema],
    sexo: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""],
        es_indexed: true
    },
    genero: {
        type: String,
        enum: ["femenino", "masculino", "otro", ""]
    },
    fechaNacimiento: {
        type: Date,
        es_indexed: true
    },
    fechaFallecimiento: Date,
    estadoCivil: {
        type: String,
        enum: ["casado", "separado", "divorciado", "viudo", "soltero", "concubino", "otro", ""]
    },
    foto: String,
    Nacionalidad: String,
    relaciones: [{
            relacion: {
                type: String,
                enum: ["padre", "madre", "hijo", "hermano", "tutor", ""]
            },
            referencia: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'paciente'
            },
            nombre: String,
            apellido: String,
            documento: String
        }],
    financiador: [{
            entidad: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            },
            codigo: String,
            activo: Boolean,
            fechaAlta: Date,
            fechaBaja: Date,
            ranking: Number,
        }],
    claveBlocking: [String],
    entidadesValidadoras: [String]
});
//Defino Virtuals
pacienteSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});
//Creo un indice para fulltext Search
pacienteSchema.index({
    '$**': 'text'
});
//conectamos con elasticSearch
pacienteSchema.plugin(mongoosastic, {
    hosts: [config.connectionStrings.elastic_main],
    index: 'andes',
    type: 'paciente'
});
var paciente = mongoose.model('paciente', pacienteSchema, 'paciente');
module.exports = paciente;
//# sourceMappingURL=paciente.js.map