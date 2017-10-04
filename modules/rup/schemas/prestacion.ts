import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';
import * as registro from './prestacion.registro';
import * as estado from './prestacion.estado';
import { auditoriaPrestacionPacienteSchema } from '../../auditorias/schemas/auditoriaPrestacionPaciente';
import { iterate, convertToObjectId } from '../controllers/rup';

export let schema = new mongoose.Schema({
    // Datos principales del paciente
    paciente: {
        // requirido, validar en middleware
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        telefono: String,
        sexo: String,
        fechaNacimiento: Date
    },

    // Datos de la solicitud
    solicitud: {
        // Tipo de prestación de ejecutarse
        tipoPrestacion: SnomedConcept,
        // Fecha de solicitud
        // Nota: Este dato podría obtener del array de estados, pero está aquí para facilidar de consulta
        fecha: {
            type: Date,
            required: true
        },
        // ID del turno relacionado con esta prestación
        turno: mongoose.Schema.Types.ObjectId,
        // Profesional que solicita la prestacion
        profesional: {
            // requerido, validar en middleware
            id: mongoose.Schema.Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String
        },
        // Organizacion desde la que se solicita la prestacion
        organizacion: {
            // requirido, validar en middleware
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },
        // ID de la prestación desde la que se generó esta solicitud
        prestacionOrigen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'prestacion'
        },
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
            // requirido, validar en middleware
        },
        // Lugar donde se realiza
        organizacion: {
            // requirido, validar en middleware
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },
        // Registros de la ejecución
        registros: [registro.schema],
    },
    // Historia de estado de la prestación
    estados: [estado.schema]
});

// Valida el esquema
schema.pre('save', function (next) {
    let prestacion = this;

    if (!prestacion.paciente.id) {
        let err = new Error('Debe seleccionar el paciente');
        return next(err);
    }

    if (!prestacion.solicitud.organizacion.id) {
        let err = new Error('Debe seleccionar la organizacion desde la cual se solicita');
        return next(err);
    }

    if (!prestacion.solicitud.profesional.id) {
        let err = new Error('Debe seleccionar el profesional que solicita');
        return next(err);
    }
    if (prestacion.estados[prestacion.estados.length - 1].tipo === 'ejecucion') {
        if (!prestacion.ejecucion.fecha) {
            let err = new Error('Debe seleccionar la fecha en que se solicita');
            return next(err);
        }

        if (!prestacion.ejecucion.organizacion.id) {
            let err = new Error('Debe seleccionar la organizacion desde la cual se solicita');
            return next(err);
        }
    }

    if (prestacion.ejecucion.registros.length) {
        // Itera todos las todas las propiedades de todos los registros para convertir
        // las propiedades id y _id a ObjectId
        prestacion.ejecucion.registros.forEach(r => {
            iterate(r.valor, convertToObjectId);
        });
    }

    next();
});


// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

export let model = mongoose.model('prestacion', schema, 'prestaciones');
