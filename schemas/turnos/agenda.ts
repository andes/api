import * as mongoose from 'mongoose';

var agendaSchema = new mongoose.Schema({
    nombre: String,
    prestaciones: [{
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }],//requerido

    profesionales: [{
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String
    }],

    espacioFisico: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    horaInicio: Date,
    horaFin: Date,
    bloques: [{
        horaInicio: Date,
        horaFin: Date,
        cantidadTurnos: Number,
        descripcion: String,
        prestaciones: [{
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        }],

        accesoDirectoDelDia: Number,
        accesoDirectoProgramado: Number,
        reservadoProgramado: Number,
        reservadoProfesional: Number,

        pacienteSimultaneos: Boolean,
        cantidadSimultaneos: Number,
        citarPorBloque: Boolean
    }],
    estado: {
            type: String,
            enum: ["","Planificada", "Publicada"]
    }
});

var agenda = mongoose.model('agenda', agendaSchema, 'agenda');

export = agenda;
