import * as mongoose from 'mongoose';

export let farmaciasTurnosSchema = new mongoose.Schema({
    nombre: {
        type: String
    },
    direccion: {
        type: String
    },
    telefono: {
        type: String
    },
    fecha: {
        type: Date
    },
    localidad: {
        type: String,
    },
    latitud: {type: Number, required: false},
    longitud: {type: Number, required: false}
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
