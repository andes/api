import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as cie10 from '../../../core/term/schemas/cie10';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as obraSocialSchema from '../../obraSocial/schemas/obraSocial';
import { SnomedConcept } from '../../rup/schemas/snomed-concept';
import * as IEstadoFacturacion from '../../facturacionAutomatica/schemas/estadoFacturacion';

const pacienteSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    apellido: String,
    alias: String,
    documento: String,
    fechaNacimiento: Date,
    telefono: String,
    sexo: String,
    carpetaEfectores: [{
        organizacion: nombreSchema,
        nroCarpeta: String
    }],
    obraSocial: { type: obraSocialSchema }
});


const turnoSchema = new mongoose.Schema({
    horaInicio: Date,
    asistencia: {
        type: String,
        enum: ['asistio', 'noAsistio', 'sinDatos']
    },
    primeraVez: {
        type: {
            profesional: Boolean,
            tipoPrestacion: Boolean
        }
    },
    estado: {
        type: String,
        enum: ['disponible', 'asignado', 'suspendido', 'turnoDoble'],
        default: 'disponible'
    },
    reasignado: {
        type: {
            anterior: {
                idAgenda: mongoose.Schema.Types.ObjectId,
                idBloque: mongoose.Schema.Types.ObjectId,
                idTurno: mongoose.Schema.Types.ObjectId
            },
            siguiente: {
                idAgenda: mongoose.Schema.Types.ObjectId,
                idBloque: mongoose.Schema.Types.ObjectId,
                idTurno: mongoose.Schema.Types.ObjectId
            }
        },
    },
    tipoTurno: {
        type: String,
        enum: ['delDia', 'programado', 'gestion', 'profesional']
    },
    nota: String,
    motivoSuspension: {
        type: String,
        enum: ['edilicia', 'profesional', 'organizacion', 'agendaSuspendida']
    },
    avisoSuspension: {
        type: String,
        enum: ['no enviado', 'enviado', 'fallido']
    },
    emitidoPor: String, // Agregamos para identificar desde donde se emitio el turno. Ej: appmobile.
    paciente: pacienteSchema,
    motivoConsulta: String,
    tipoPrestacion: {
        type: tipoPrestacionSchema
    },
    idPrestacionPaciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'prestacionPaciente'
    },
    // Unificamos los diagnósticos(codificaciones) en un solo arreglo, el DIAGNOSTICO PRINCIPAL será el que este en la posición 0.
    // Si ambas codificaciones coinciden, la auditoría aprobó la cod.
    // Si las codificaciones difieren, auditoría realizo un reparo
    // Si cod.Profesional no está cargado y codAuditoria si, se cargó por planilla y se considera el turno auditado
    diagnostico: {
        ilegible: Boolean,
        codificaciones: [{
            // (ver schema) solamente obtenida de RUP o SIPS y definida por el profesional
            codificacionProfesional: {
                cie10: cie10.schema,
                snomed: SnomedConcept
            },
            // (ver schema) corresponde a la codificación establecida la instancia de revisión de agendas
            codificacionAuditoria: cie10.schema,
            primeraVez: Boolean,
        }]
    },
    estadoFacturacion: {
        tipo: String,
        estado: { type: String, default: 'Sin comprobante' },
        numeroComprobante: String
    },
    confirmedAt: Date, /* Confirmación del turno por el  paciente */
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed
});

export = turnoSchema;
