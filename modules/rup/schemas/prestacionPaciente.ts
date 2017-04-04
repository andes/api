import * as mongoose from 'mongoose';
import * as evolucionSchema from './evolucion';
import * as financiadorSchema from '../../../core/mpi/schemas/financiador';
import { problemaSchema } from './problema';
import * as organizacion from '../../../core/tm/schemas/organizacion';
import { pacienteSchema } from '../../../core/mpi/schemas/paciente';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';


export let prestacionPacienteSchema = new mongoose.Schema({
    // nombre: String,
    // descripcion: String,
    // codigo: [codificadorSchema],
    idPrestacionOrigen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'prestacionPaciente'
    }, // prestacion desde la que se solicita
    paciente: {
        type: pacienteSchema,
        required: true
    },

    solicitud: {
        // tipo de prsetacion a ejecutarse
        tipoPrestacion: tipoPrestacionSchema,
        // fecha de solicitud
        fecha: {
            type: Date,
            required: true
        },
        // ambito desde el cual se solicita
        procedencia: {
            type: String,
            enum: ['ambulatorio', 'guardia', 'internación']
        },
        // prioridad de la solicitud
        prioridad: {
            type: String,
            enum: ['no prioritario', 'urgencia', 'emergencia']
        },
        // proposito por el cual voy a ejecutar
        proposito: [{
            type: String,
            enum: ['control', 'diagnostica', 'tamizaje', 'otra']
        }],
        // estado del paciente en el episodio
        estadoPaciente: {
            type: String,
            enum: ['ambulatorio', 'internado']
        },
        // profesional que solicita la prestacion
        profesional: profesionalSchema,
        // organizacion desde la que se solicita la prestacion
        organizacion: organizacion.schema,
        // lista de problemas del paciente por el cual se solicita la prestacion
        listaProblemas: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'problemas'
        }],

        // datos propios de la solicitud
        datosPropios: {
            type: mongoose.Schema.Types.Mixed // estos datos vienen desde un componente dinamico
        },

        // frecuencia de ejecucion de la prestacion
        frecuencia: {
            valor: String,
            unidad: String
        },
        // motivo de consulta autoreferido por el paciente
        // motivoConsultaPaciente: String,
        // motivoConsulta: {
        //     codificadorSchema
        // },
        // en caso de tener que necesitar un turno para la prestacion
        requiereTurno: Boolean,
        idTurno: mongoose.Schema.Types.ObjectId,
        // contactos del paciente
        // otroContacto: {
        //     contactoSchema
        // },
        // Deben ser los financiadorse que tiene le paciente
        financiador: {
            financiadorSchema
        },

        // datos complementarios de la organizacion, aca se podran almacenar
        // valores particulares de cada organizacion
        datosComplementarios: {
            momentoRealizacionSolicitud: {
                type: String,
                enum: ['guardia pasiva', 'guardia activa', 'horario laboral']
            },
            observaciones: String,
            idProfesionalAsignado: mongoose.Schema.Types.ObjectId
        },
    },


    ejecucion: {
        // resumen de las prestaciones que se ejecutaron
        prestaciones: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'prestacionPaciente'
        }],
        listaProblemas: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'problemas'
        }],
        fecha: Date,
        organizacion: organizacion.schema,
        profesionales: [profesionalSchema],
        // TODO: Definir evoluciones y prestacionesSolicitadas bajo
        // que objeto van a estar,... solicitud .. ejecucion .. ¿postEjecucion?
        evoluciones: [
            evolucionSchema
        ],
        datosPropios: {
            type: mongoose.Schema.Types.Mixed
        }
    },

    // a futuro que se ejecuta
    prestacionesSolicitadas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'prestacionPaciente'
    }],

    // // resumen de las prestaciones que se ejecutaron
    // prestacionesEjecutadas: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'prestacionPaciente'
    // }],

    estado: [
        {
            timestamp: Date,
            tipo: {
                type: String,

                enum: ['pendiente', 'ejecucion', 'en auditoría', 'aceptada', 'rechazada', 'validada']
            }
        }
    ]
});

// Habilitar plugin de auditoría
prestacionPacienteSchema.plugin(require('../../../mongoose/audit'));

export let prestacionPaciente = mongoose.model('prestacionPaciente', prestacionPacienteSchema, 'prestacionPaciente');
