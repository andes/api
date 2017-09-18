import * as mongoose from 'mongoose';
import {
    tipoPrestacionSchema
} from '../../../core/tm/schemas/tipoPrestacion';
import * as constantes from './constantes';

export let agendaSipsCacheSchema = new mongoose.Schema({
    id: Object,
    organizacion: Object,
    profesionales: Object,
    tipoPrestaciones: Object,
    espacioFisico: Object,
    bloques: Object,
    estado: String,
    horaInicio: Date,
    horaFin: Date,
    createdAt: Date,
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed
});

export let agendaSipsCache = mongoose.model('agendaSipsCache', agendaSipsCacheSchema, 'agendaSipsCache');
