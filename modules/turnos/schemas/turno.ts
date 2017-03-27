import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';

var turnoSchema = new mongoose.Schema({ 
    horaInicio: Date,
    asistencia: {
        type: Boolean,
        default: false
    },
    estado: {
        type: String,
        enum: ['disponible', 'asignado', 'bloqueado'],
        default: 'disponible'
    },
    tipoTurno: {
        type: String,
        enum: ['delDia', 'programado', 'gestion', 'profesional']
    },
    nota: String,
    motivoSuspension: {
        type: String,
        enum: ["Edilicia", "Profesional", "Organizacion"]
    },
    paciente: { // pensar que otros datos del paciente conviene tener
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        telefono: String
    },
    tipoPrestacion: tipoPrestacionSchema,
    // TODO: Enlace con RUP? cuando alguien defina ALGO
    idPrestacionPaciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'prestacionPaciente'
    }
});

export = turnoSchema;