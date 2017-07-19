import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';
import * as registro from './prestacion.registro';
import * as estado from './prestacion.estado';
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
        // Fecha de solicitud
        // Nota: Este dato podría obtener del array de estados, pero está aquí para facilidad de consulta
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
            },
            required: true
        },
        // ID de la prestación desde la que se generó esta solicitud
        prestacionOrigen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'prestacion'
        },
        // problemas/hallazgos/trastornos por los cuales se solicita la prestación
        relacionadoCon: [SnomedConcept],
        // Registros de la solicitud ... para los planes o prestaciones futuras
        registros: [registro.schema],
        // Datos de auditoría sobre el estado de la solicitud (aprobada, desaprobada, ...)
        auditoria: auditoriaPrestacionPacienteSchema
    },

    // Datos de la ejecución (i.e. realización)
    ejecucion: {
        // Fecha de ejecución
        // Nota: Este dato podría obtener del array de estados, pero está aquí para facilidad de consulta
        fecha: {
            type: Date,
            //required: true
        },
        // ID del turno relacionado con esta prestación
        turno: mongoose.Schema.Types.ObjectId,
        // Lugar donde se realiza
        organizacion: {
            type: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            },
            //required: true
        },
        // Registros de la ejecución
        registros: [registro.schema],
    },
    // Historia de estado de la prestación
    estados: [estado.schema]
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

export let model = mongoose.model('prestacion', schema, 'prestacion');
