import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { cie10Schema } from '../../../core/term/schemas/cie10';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
// import * as organizacion from '../../../core/tm/schemas/organizacion';

let turnoSchema = new mongoose.Schema({
    horaInicio: Date,
    asistencia: {
        type: String,
        enum: ['asistio', 'noAsistio', 'sinDatos']
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
        enum: ['edilicia', 'profesional', 'organizacion']
    },
    paciente: { // pensar que otros datos del paciente conviene tener
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        telefono: String,
        carpetaEfectores: [{
            organizacion: nombreSchema,
            nroCarpeta: String
        }],
    },
    tipoPrestacion: tipoPrestacionSchema,
    // TODO: Enlace con RUP? cuando alguien defina ALGO
    idPrestacionPaciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'prestacionPaciente'
    },
    diagnosticoPrincipal: {
        codificacion: cie10Schema,
        primeraVez: Boolean,
        ilegible: Boolean,
    },
    diagnosticoSecundario: [{
        codificacion: cie10Schema,
        ilegible: Boolean,
    }],
    confirmedAt: Date, /* Confirmación del turno por el  paciente */
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed
});

export = turnoSchema;
