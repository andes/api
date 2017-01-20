import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import * as profesionalSchema from '../../../core/tm/schemas/profesional';
import * as organizacionSchema from '../../../core/tm/schemas/organizacion';
import * as prestacionSchema from '../../../core/tm/schemas/prestacion';
import * as espacioFisicoSchema from '../../turnos/schemas/espacioFisico';

var evolucionSchema = new mongoose.Schema({

    recursos: {
        profesionales: [
            profesionalSchema
        ],
        espacios_fisicos: [
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
        motivoConsulta: [
            codificadorSchema
        ],
        fechaRealizacion: Date,
        proposito: {
            type: String,
            enum: ['control', 'diagnostica', 'tamizaje', 'otra']
        },
        profesionales: [
            profesionalSchema
        ]
    },

    valores: [{
        type: mongoose.Schema.Types.Mixed,
        valor: String
    }]


})