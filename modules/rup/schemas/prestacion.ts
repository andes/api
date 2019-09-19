import { SemanticTag } from './semantic-tag';
import * as mongoose from 'mongoose';
import * as registro from './prestacion.registro';
import * as estado from './prestacion.estado';
import { auditoriaPrestacionPacienteSchema } from '../../auditorias/schemas/auditoriaPrestacionPaciente';
import { iterate, convertToObjectId } from '../controllers/rup';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { financiadorSchema } from '../../../core/mpi/schemas/financiador';

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
        fechaNacimiento: Date,
        obraSocial: financiadorSchema
    },
    noNominalizada: {
        type: Boolean,
        required: true,
        default: false
    },
    estadoFacturacion: {
        tipo: String,
        numero: Number,
        estado: String
    },
    // Datos de la Solicitud
    solicitud: {

        // Fecha de Solicitud: este dato se podría obtener del array de estados, pero está aquí para facilitar la consulta
        fecha: {
            type: Date,
            required: true
        },

        // Ambito de la prestacion: ambulatorio, internacion, emergencia, etc.
        ambitoOrigen: {
            type: String,
            required: false,
            default: 'ambulatorio'
        },

        // Tipo de Prestación a ejecutarse (destino)
        tipoPrestacion: {
            id: mongoose.Schema.Types.ObjectId,
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: SemanticTag,
            refsetIds: [String],
            noNominalizada: Boolean
        },
        tipoPrestacionOrigen: {
            id: mongoose.Schema.Types.ObjectId,
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: SemanticTag,
            refsetIds: [String]
        },

        // Datos de auditoría sobre el estado de la solicitud (aprobada, desaprobada, ...)
        auditoria: auditoriaPrestacionPacienteSchema,

        // ID del turno relacionado con esta prestación
        turno: mongoose.Schema.Types.ObjectId,

        // Registros de la solicitud ... para los planes o prestaciones futuras
        registros: [registro.schema],

        // Organización Destino de la solicitud.
        organizacion: {
            // requirido, validar en middleware
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },

        organizacionOrigen: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },

        // Profesional Destino
        profesional: {
            // requerido, validar en middleware
            id: mongoose.Schema.Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String
        },

        profesionalOrigen: {
            // requerido, validar en middleware
            id: mongoose.Schema.Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String
        },

        // ID de la Prestación desde la que se generó esta Solicitud
        prestacionOrigen: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'prestacion'
        }
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

        /**
         *  DESTINO DE SOLICITUD
         *      a.  Organización: Si no existe se completa con una copia de ejecucion.registros.createdBy.organizacion.
         *          Si no hay registros se completa con createdBy.organizacion
         *
         *      b.  Profesionales: Si no existe se completa con una copia de solicitud.registros.valor.solicituPrestacion.profesionales.
         *          Si no hay registros se completa con solicitud.profesional
         *
         */

        // Registros de la ejecución
        registros: [registro.schema],
    },
    // Historia de estado de la prestación
    estados: [estado.schema]
}, { usePushEach: true } as any);

// Valida el esquema
schema.pre('save', function (next) {
    let prestacion: any = this;

    if (!prestacion.solicitud.tipoPrestacion.noNominalizada && !prestacion.paciente.id) {
        let err = new Error('Debe seleccionar el paciente');
        return next(err);
    }
    // Prestación debe tener organización asignada
    // Solicitudes deben tener organización origen asignada
    if (!prestacion.solicitud.organizacion.id && (prestacion.solicitud.tipoPrestacionOrigen.conceptId && prestacion.solicitud.organizacionOrigen.id)) {
        let err = new Error('Debe seleccionar la organizacion desde la cual se solicita');
        return next(err);
    }
    // Si es prestación debe tener profesional asignado, y si es solicitud debe tener profesional origen asignado.
    if (!prestacion.solicitud.profesional.id && (prestacion.solicitud.tipoPrestacionOrigen.conceptId && !prestacion.solicitud.profesionalOrigen.id)) {
        let err = new Error('Debe seleccionar el profesional que solicita');
        return next(err);
    }
    if (prestacion.estados[prestacion.estados.length - 1].tipo === 'ejecucion') {
        if (!prestacion.ejecucion.fecha && !prestacion.createdAt) {
            let err = new Error('Debe seleccionar la fecha en que se solicita');
            return next(err);
        }

        if (!prestacion.ejecucion.organizacion && !prestacion.solicitud.organizacion.id) {
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
schema.plugin(AuditPlugin);
schema.index({ 'solicitud.turno': 1 });

schema.index({ 'solicitud.fecha': -1 });
schema.index({ 'paciente.id': 1 });
schema.index({
    'solicitud.organizacion.id': 1,
    'solicitud.ambitoOrigen': 1,
    'ejecucion.fecha': 1,
    'solicitud.tipoPrestacion.conceptId': 1
});
schema.index({ 'solicitud.auditoria.auditor.documento': 1 });


export let model = mongoose.model('prestacion', schema, 'prestaciones');
