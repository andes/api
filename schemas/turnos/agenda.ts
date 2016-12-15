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
    intercalar: Boolean,
    bloques: [{
        horaInicio: Date,
        horaFin: Date,
        cantidadTurnos: Number,
        duracionTurno: Number,
        descripcion: String,
        prestaciones: [{
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        }],

        accesoDirectoDelDia: Number,
        accesoDirectoProgramado: Number,
        reservadoGestion: Number,
        reservadoProfesional: Number,

        pacienteSimultaneos: Boolean,
        cantidadSimultaneos: Number,
        citarPorBloque: Boolean,
        turnos: [{
            horaInicio: Date,
            estado:
            {
                type: String,
                enum: ["disponible", "asignado"]
            },
            paciente: {//ver que otros datos del paciente conviene tener
                id: mongoose.Schema.Types.ObjectId,
                nombre: String,
                apellido: String,
            },
            pacientes: [{//este array se va a usar solo en el caso de pacientes simultaneos
                id: mongoose.Schema.Types.ObjectId,
                nombre: String,
                apellido: String,
            }],
            prestacion: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            }
        }],
    }],

    estado: {
        type: String,
        enum: ["", "Planificada", "Publicada"]
    }
});

var agenda = mongoose.model('agenda', agendaSchema, 'agenda');

export = agenda;
