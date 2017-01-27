"use strict";
var mongoose = require('mongoose');
var codificadorSchema = require('./codificador');
var profesionalSchema = require('../../../core/tm/schemas/profesional');
var espacioFisicoSchema = require('../../turnos/schemas/espacioFisico');
var evolucionSchema = new mongoose.Schema({
    recursos: {
        profesionales: [
            profesionalSchema
        ],
        espaciosFisicos: [
            espacioFisicoSchema
        ],
        medicamentos: [
            codificadorSchema
        ],
        insumos: [
            codificadorSchema
        ],
        equipamientos: [
            codificadorSchema
        ]
    },
    topografia: [
        codificadorSchema
    ],
    diagnosticos: [
        codificadorSchema
    ],
    // Evolución Administrativa
    momentoRealizacion: {
        type: String,
        enum: ['guardia pasiva', 'guardia activa', 'horario laboral']
    },
    // Evolución de Calidad del proceso "3 horas"
    tiempoRealizacion: {
        valor: String,
        unidad: String
    },
    preparacion: {
        adecuada: Boolean,
        observaciones: String
    },
    // Consultar a Grupo de Avanzada (?)
    conclusion: {
        finalizada: Boolean,
        observaciones: String
    },
    // Informe
    informe: {
        fechaRealizacion: Date,
        proposito: {
            type: String,
            enum: ['control', 'diagnostica', 'tamizaje', 'otra']
        },
        profesionales: [
            profesionalSchema
        ],
        //lista de problemas que surjan de la evolucion
        diagnostico: [
            codificadorSchema]
    },
    valores: [
        mongoose.Schema.Types.Mixed
    ]
});
module.exports = evolucionSchema;
//# sourceMappingURL=evolucion.js.map