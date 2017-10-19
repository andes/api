import * as mongoose from 'mongoose';

let busquedasAgendaSchema = new mongoose.Schema({
    idPrestacion: String,
    idProfesional: String,
    fechaBusqueda: Date
});

let busquedasAgenda = mongoose.model('busquedasAgenda', busquedasAgendaSchema, 'busquedasAgenda');

export = busquedasAgenda;
