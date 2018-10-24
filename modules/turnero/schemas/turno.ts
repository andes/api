import { Schema, model} from 'mongoose';

export let TurneroSchema = new Schema({
    horaInicio: Date,
    horaLlamada: Date,
    espacioFisico: Array,
    paciente: Array,
    profesional: Array,
    tipoPrestacion: Array
});

export let Turno = model('turno', TurneroSchema, 'turnero');
