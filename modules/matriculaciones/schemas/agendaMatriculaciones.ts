import * as mongoose from 'mongoose';

var agendaMatriculacionesSchema = new mongoose.Schema({
    diasHabilitados: { type: Array, required: true },
    horarioInicioTurnos: { type: String, required: true },
    horarioFinTurnos: { type: String, required: true },
    fechasExcluidas: [Date],
    duracionTurno: { type: Number, required: true }
});

//Virtuals


var agendaMatriculaciones = mongoose.model('agendaMatriculaciones', agendaMatriculacionesSchema, 'agendaMatriculaciones');

export = agendaMatriculaciones;
