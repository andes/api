import * as mongoose from 'mongoose';

var busquedasAgendaSchema = new mongoose.Schema({
    idPrestacion: String,
    idProfesional: String,
    fechaBusqueda: Date
    //usuario
});

var busquedasAgenda = mongoose.model('busquedasAgenda', busquedasAgendaSchema, 'busquedasAgenda');

export = busquedasAgenda;