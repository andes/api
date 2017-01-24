import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import * as evolucionSchema from './evolucion';
import * as pacienteSchema from '../../../core/mpi/schemas/paciente';
import * as financiadorSchema from '../../../core/mpi/schemas/financiador';
import * as contactoSchema from '../../../core/tm/schemas/contacto';
import * as profesionalSchema from '../../../core/tm/schemas/profesional';
import * as organizacionSchema from '../../../core/tm/schemas/organizacion';
import * as prestacionSchema from '../../../core/tm/schemas/prestacion';

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
        prestacionSchema
    },
    idSolicitudOrigen: mongoose.Schema.Types.ObjectId,
    frecuencia: {
        valor: String,
        unidad: String
    },
    motivoConsultaPaciente: String,

    motivoConsulta: {
        codificadorSchema
    },

    requiereTurno: Boolean,
    idTurno: mongoose.Schema.Types.ObjectId,

    otroContacto: {
        contactoSchema
    },

    financiador: {
        financiadorSchema
    },

    profesionalSolicitud: {
        type: profesionalSchema,
        required: true
    },

    organizacion: {
        organizacionSchema
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

export = solicitudSchema;