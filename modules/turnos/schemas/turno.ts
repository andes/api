import { schema } from './../../rup/schemas/prestacion';
import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as cie10 from '../../../core/term/schemas/cie10';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
// import * as organizacion from '../../../core/tm/schemas/organizacion';

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
    paciente: { // pensar que otros datos del paciente conviene tener
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        fechaNacimiento: Date,
        telefono: String,
        carpetaEfectores: [{
            organizacion: nombreSchema,
            nroCarpeta: String
        }],
    },
    tipoPrestacion: {
        type: tipoPrestacionSchema
    },
    // TODO: Enlace con RUP? cuando alguien defina ALGO
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
            codificacionProfesional: cie10.schema, // solamente obtenida de RUP o SIPS y definida por el profesional
            codificacionAuditoria: cie10.schema,  // corresponde a la codificación establecida la instancia de revisión de agendas
            primeraVez: Boolean,
        }]
    },
    confirmedAt: Date, /* Confirmación del turno por el  paciente */
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed
});

export = turnoSchema;
