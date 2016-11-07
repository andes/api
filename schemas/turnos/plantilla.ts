import * as mongoose from 'mongoose';

var plantillaSchema = new mongoose.Schema({  
    
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

    descripcion: String,
    bloques:[{
        horaInicio: Date,
        horaFin: Date,
        cantidadTurnos: Number,
        descripcion: String,
        prestacion: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },
        
        deldiaAccesoDirecto: Number,
        deldiaReservado: Number,
        programadosAccesoDirecto: Number,
        programadosReservado: Number,
        programadosAutocitado: Number,

        pacienteSimultaneos: Boolean,
        cantidadSimultaneos: Number,
        citarPorBloque: Boolean
    }]
});

var plantilla = mongoose.model('formato', plantillaSchema, 'plantilla');

export = plantilla;
