import * as mongoose from 'mongoose';
import {
    tipoPrestacionSchema
} from '../../../core/tm/schemas/tipoPrestacion';
import * as constantes from './constantes';

export let agendaSipsCacheSchema = new mongoose.Schema({
    agenda: {
        organizacion: Object,
        profesionales: Object,
        tipoPrestaciones: Object,
        espacioFisico: Object,
        estado: String,
        horaInicio: Date,
        horaFin: Date
    },
    turno: {
        idAgenda: mongoose.Schema.Types.ObjectId,
        estado: String,
        horaInicio: Date,
        tipoTurno: Object,
        paciente: {
            id: mongoose.Schema.Types.ObjectId,
            documento: String,
            nombre: String,
            apellido: String,
            sexo: constantes.SEXO,
            fechaNacimiento: Date
        }
    },
    createdAt: Date,
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed
});

export let agendaSipsCache = mongoose.model('agendaSipsCache', agendaSipsCacheSchema, 'agendaSipsCache');