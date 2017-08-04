import * as mongoose from 'mongoose';

export let farmaciasTurnosSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    direccion: {
        type: String,
        required: true
    },
    telefono: {
        type: String,
        required: true
    },
    fecha: {
        type: Date,
        required: true
    },
    localidad: {
        type: Number,
        required: true
    }
});

export let farmaciasLocalidadesSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    localidadId: {
        type: String,
        required: true
    }
});

export let farmaciasLocalidades = mongoose.model('farmaciasLocalidades', farmaciasLocalidadesSchema, 'farmaciasLocalidades');
export let farmaciasTurnos = mongoose.model('farmaciasTurnos', farmaciasTurnosSchema, 'farmaciasTurnos');
