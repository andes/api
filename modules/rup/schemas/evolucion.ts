import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
// import * as prestacionSchema from '../../../core/tm/schemas/prestacion';
import { espacioFisicoSchema } from '../../turnos/schemas/espacioFisico';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import { segundaOpinionSchema } from './segundaOpinion';

let evolucionSchema = new mongoose.Schema({
    // Evolucion Profesional
    topografia: [
        codificadorSchema
    ],

    // valores que se almacen al evolucionar la prestacion
    valores: mongoose.Schema.Types.Mixed,

    // Informe en caso de existir por el tipo de prestacion
    informe: [{
        fechaRealizacion: Date,
        proposito: {
            type: String,
            enum: ['control', 'diagnostica', 'tamizaje', 'otra']
        },
        profesionales: [
            profesionalSchema
        ],

        // lista de problemas que surjan de la evolucion. Lo diagnosticos alimentan la lista de problemas de pacientes
        diagnostico: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'problemas'
        }],
        texto: String
    }],

    // campo destinado a segundas opiniones o auditorias de las prestaciones
    segundaOpinion: [segundaOpinionSchema],

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
                enum: ['ejecucion', 'dictado', 'transcripcion', 'informado', '']
            },
            observaciones: String
        }
    ],

});
export = evolucionSchema;
