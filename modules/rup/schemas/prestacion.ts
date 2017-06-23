import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';
import * as registro from './prestacion.registro';
import * as estado from './prestacion.estado';
import { auditoriaPrestacionPacienteSchema } from '../../auditorias/schemas/auditoriaPrestacionPaciente';

let profesional = {
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    apellido: String,
    documento: String
};

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
        // Nota: a veces el usuario que registra la prestación (que se guarda en el array registros a través del plugin audit)
        //       no necesariamente es el mismo que ejecuta. Por ejemplo, un residente tipea un informe y el médico de planta lo valida digitalmente.
        //       En este caso, ambos dos figuran en 'profesionales' pero sólo el residente en 'registros'.
        profesionales: [profesional],
        // Lugar donde se realiza
        organizacion: {
            type: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            }
        },
        // Registros de la ejecución
        registros: [registro.schema],
    },
    // Historia de estado de la prestación
    estados: [estado.schema]
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

export let prestacion = mongoose.model('prestacion', schema, 'prestacion');
