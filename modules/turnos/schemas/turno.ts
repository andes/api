import { schema } from './../../rup/schemas/prestacion';
import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as cie10 from '../../../core/term/schemas/cie10';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as obraSocialSchema from '../../obraSocial/schemas/obraSocial';

let turnoSchema = new mongoose.Schema({
    horaInicio: Date,
    asistencia: {
        type: String,
        enum: ['asistio', 'noAsistio', 'sinDatos']
    },
    primeraVez: {
        profesional: Boolean,
        tipoPrestacion: Boolean
    },
    estado: {
        type: String,
        enum: ['disponible', 'asignado', 'suspendido', 'turnoDoble'],
        default: 'disponible'
    },
    reasignado: {
        anterior: {
            idAgenda: mongoose.Schema.Types.ObjectId,
            idBloque: mongoose.Schema.Types.ObjectId,
            idTurno: mongoose.Schema.Types.ObjectId
        },
        siguiente: {
            idAgenda: mongoose.Schema.Types.ObjectId,
            idBloque: mongoose.Schema.Types.ObjectId,
            idTurno: mongoose.Schema.Types.ObjectId
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
    paciente: { // pensar que otros datos del paciente conviene tener
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
    },
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
            codificacionProfesional: cie10.schema,
            // (ver schema) corresponde a la codificación establecida la instancia de revisión de agendas
            codificacionAuditoria: cie10.schema,
            primeraVez: Boolean,
        }]
    },
    confirmedAt: Date, /* Confirmación del turno por el  paciente */
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed
});

export = turnoSchema;
