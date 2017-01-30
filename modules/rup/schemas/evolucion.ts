import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import * as profesionalSchema from '../../../core/tm/schemas/profesional';
import * as organizacionSchema from '../../../core/tm/schemas/organizacion';
import * as prestacionSchema from '../../../core/tm/schemas/prestacion';
import * as espacioFisicoSchema from '../../turnos/schemas/espacioFisico';

var evolucionSchema = new mongoose.Schema({
    // Evolucion Profesional

    topografia: [
        codificadorSchema
    ],

    // Informe
    informe: [{
        fechaRealizacion: Date,
        proposito: {
            type: String,
            enum: ['control', 'diagnostica', 'tamizaje', 'otra']
        },
        profesionales: [
            profesionalSchema
        ],

        //lista de problemas que surjan de la evolucion. Lo diagnosticos alimentan la lista de problemas de pacientes
        diagnostico: [
            codificadorSchema
        ],
        texto: String
    }],

    // campo destinado a segundas opiniones o auditorias de las prestaciones
    segundaOpinion: [{
        //usuario: usuarioSchema 
        texto: String,
        fechaRealizacion: Date
    }],

    valores: [
        mongoose.Schema.Types.Mixed
    ],

    // Evolución gestion
    momentoRealizacion: {
        type: String,
        enum: ['guardia pasiva', 'guardia activa', 'horario laboral']
    },

    recursos: {
        otrosProfesionales: [
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



    // Evolución de Calidad del proceso

    tiempoRealizacion: {
        valor: String,
        unidad: String
    },

    preparacion: {
        adecuada: Boolean,
        observaciones: String
    },

    estado: [
        {
            timestamp: Date,
            tipo: {
                type: String,
                enum: ["ejecucion", "dictado", "transcripcion", "informado", ".............."] // 
            },
            observaciones: String
        }
    ],

})

export = evolucionSchema;