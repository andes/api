import * as mongoose from 'mongoose';

export let turneroSchema = new mongoose.Schema({
    horaInicio: Date,
    horaLlamada: Date,
    espacioFisico: Array,
    paciente: Array,
    profesional: Array,
    tipoPrestacion: Array
});

export let turno = mongoose.model('turno', turneroSchema, 'turnero');
