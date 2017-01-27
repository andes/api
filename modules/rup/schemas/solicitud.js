"use strict";
var mongoose = require('mongoose');
var codificadorSchema = require('./codificador');
var evolucionSchema = require('./evolucion');
var pacienteSchema = require('../../../core/mpi/schemas/paciente');
var financiadorSchema = require('../../../core/mpi/schemas/financiador');
var contactoSchema = require('../../../core/tm/schemas/contacto');
var profesionalSchema = require('../../../core/tm/schemas/profesional');
var organizacionSchema = require('../../../core/tm/schemas/organizacion');
var prestacionSchema = require('../../../core/tm/schemas/prestacion');
var solicitudSchema = new mongoose.Schema({
    fechaSolicitud: {
        type: Date,
        required: true
    },
    paciente: {
        type: pacienteSchema,
        required: true
    },
    prestacion: {
        prestacionSchema: prestacionSchema
    },
    idSolicitudOrigen: mongoose.Schema.Types.ObjectId,
    frecuencia: {
        valor: String,
        unidad: String
    },
    motivoConsultaPaciente: String,
    motivoConsulta: {
        codificadorSchema: codificadorSchema
    },
    requiereTurno: Boolean,
    idTurno: mongoose.Schema.Types.ObjectId,
    otroContacto: {
        contactoSchema: contactoSchema
    },
    financiador: {
        financiadorSchema: financiadorSchema
    },
    profesionalSolicitud: {
        type: profesionalSchema,
        required: true
    },
    organizacion: {
        organizacionSchema: organizacionSchema
    },
    estado: [
        {
            timestamp: Date,
            tipo: {
                type: String,
                enum: ['pendiente', 'en auditoría', 'aceptada', 'rechazada']
            }
        }
    ],
    problemas: [
        codificadorSchema
    ],
    procedencia: {
        type: String,
        enum: ['ambulatorio', 'guardia', 'internación']
    },
    prioridad: {
        type: String,
        enum: ['no prioritario', 'urgencia', 'emergencia']
    },
    proposito: {
        type: String,
        enum: ['control', 'diganostica', 'tamizaje', 'otra']
    },
    estadoPaciente: {
        type: String,
        enum: ['ambulatorio', 'internado']
    },
    datosComplementarios: {
        momentoRealizacionSolicitud: {
            type: String,
            enum: ['guardia pasiva', 'guardia activa', 'horario laboral']
        },
        observaciones: String,
        idProfesionalAsignado: mongoose.Schema.Types.ObjectId
    },
    datosOrganizacion: [{
            // ej: servicio que solicita y servicio que brinda (HPN)
            type: mongoose.Schema.Types.Mixed
        }],
    evoluciones: [
        evolucionSchema
    ]
});
module.exports = solicitudSchema;
//# sourceMappingURL=solicitud.js.map