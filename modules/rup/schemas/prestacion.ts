import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed';
import { auditoriaPrestacionPacienteSchema } from '../../auditorias/schemas/auditoriaPrestacionPaciente';

export let schema = new mongoose.Schema({
    // Datos principales del paciente
    paciente: {
        type: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String,
            telefono: String,
            sexo: String,
            fechaNacimiento: Date
        },
        required: true
    },

    // Datos de la solicitud
    solicitud: {
        // Tipo de prestación de ejecutarse
        tipoPrestacion: SnomedConcept,
        // Fecha de la solicitud
        fecha: {
            type: Date,
            required: true
        },
        // Profesional que solicita la prestacion
        profesional: {
            type: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String,
                apellido: String,
                documento: String
            }
        },
        // Organizacion desde la que se solicita la prestacion
        organizacion: {
            type: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            }
        },
        // problemas/hallazgos/trastornos por los cuales se solicita la prestación
        hallazgos: [SnomedConcept],
        // ID del turnos a través del cual se generó esta prestacaión
        idTurno: mongoose.Schema.Types.ObjectId,
        // ID de la prestación desde la que se generó esta solicitud
        idPrestacionOrigen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'prestacion'
        },
        // Datos de auditoría sobre el estado de la solicitud (aprobada, desaprobada, ...)
        auditoria: auditoriaPrestacionPacienteSchema
    },

    // Datos de la ejecución (i.e. realización)
    ejecucion: {
        // Fecha que fue realizada la prestación
        fecha: Date,
        // Profesionales que realizan
        profesionales: [{
            type: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String,
                apellido: String,
                documento: String
            }
        }],
        // Lugar donde se realiza
        organizacion: {
            type: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            }
        },
        // Registros de la ejecución
        registros: [{
            concepto: SnomedConcept,
            elementoRup: mongoose.Schema.Types.ObjectId,
            valor: mongoose.Schema.Types.Mixed,
            relacionadoCon: [SnomedConcept],
        }],
    },

    estado: [
        {
            fecha: Date,
            tipo: {
                type: String,
                enum: ['anulada', ' pendiente', 'ejecucion', 'en auditoría', 'aceptada', 'rechazada', 'validada', 'desvinculada']
            },

            profesional: {
                type: { // pensar que otros datos del paciente conviene tener
                    id: mongoose.Schema.Types.ObjectId,
                    nombre: String,
                    apellido: String,
                    documento: String

                }
            }
        }
    ]
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
export let model = mongoose.model('prestacion', schema, 'prestaciones');
