import * as mongoose from 'mongoose';

const busquedasAgendaSchema = new mongoose.Schema({
    idPrestacion: String,
    idProfesional: String,
    fechaBusqueda: Date
});

const busquedasAgenda = mongoose.model('busquedasAgenda', busquedasAgendaSchema, 'busquedasAgenda');

export = busquedasAgenda;
