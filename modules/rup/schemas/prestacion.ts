import * as mongoose                from 'mongoose';
import * as codificadorSchema       from './codificador';
import * as contactoSchema          from '../../../core/tm/schemas/contacto';
import * as evolucionSchema         from './evolucion';
import * as financiadorSchema       from '../../../core/mpi/schemas/financiador';
import * as organizacionSchema      from '../../../core/tm/schemas/organizacion';
import * as pacienteSchema          from '../../../core/mpi/schemas/paciente';
import * as problemaSchema          from './problema';
import * as profesionalSchema       from '../../../core/tm/schemas/profesional';
import * as tipoPrestacionSchema    from './tipoPrestacion';


var prestacionSchema = new mongoose.Schema({
    // nombre: String,
    // descripcion: String,
    // codigo: [codificadorSchema],
    idSolicitudOrigen: mongoose.Schema.Types.ObjectId, // prestacion desde la que se solicita
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
            enum: ['control', 'diganostica', 'tamizaje', 'otra']
        }],
        // estado del paciente en el episodio
        estadoPaciente: {
            type: String,
            enum: ['ambulatorio', 'internado']
        },
        // profesional que solicita la prestacion
        profesional: profesionalSchema,
        // organizacion desde la que se solicita la prestacion
        organizacion: organizacionSchema,
        // lista de problemas del paciente por el cual se solicita la prestacion
        listaProblemas: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'problemas'
        }],
        // prestacion de origen por la cual se solicita esta nueva
        idPrestacionOrigen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'paciente'
        },
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
        otroContacto: {
            contactoSchema
        },
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
        // listaProblemas: [problemaSchema],
        fecha: Date,
        organizacion: organizacionSchema,
        profesional: profesionalSchema,
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
        ref: 'prestaciones'
    }],

    estado: [
        {
            timestamp: Date,
            tipo: {
                type: String,

                enum: ['pendiente', 'en auditoría', 'aceptada', 'rechazada', 'validada']
            }
        }
    ]
});

export = prestacionSchema;
