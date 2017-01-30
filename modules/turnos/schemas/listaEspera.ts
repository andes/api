import * as mongoose from 'mongoose';

var listaEsperaSchema = new mongoose.Schema({
    paciente: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String
    },
    prestacion: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    profesional: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String
    },
    fecha: Date, // si es una solicitud es la fecha en que se solicitó
                 // si es demanda rechazada es la fecha en que no se atendió la demanda
    vencimiento: Date,
    estado: String, //Enumerado {solicitud, demandaRechazada}  hay oferta en el mes / no hay
});

var listaEspera = mongoose.model('listaEspera', listaEsperaSchema, 'listaEspera');

export = listaEspera;