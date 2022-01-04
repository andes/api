import { Schema, model } from 'mongoose';

export const TurneroSchema = new Schema({
    horaInicio: Date,
    horaLlamada: Date,
    espacioFisico: Array,
    paciente: Array,
    profesional: Array,
    tipoPrestacion: Array
});

export const Turno = model('turno', TurneroSchema, 'turnero');
