import * as mongoose from 'mongoose';

export const farmaciasTurnosSchema = new mongoose.Schema({
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

export const farmaciasLocalidadesSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    localidadId: {
        type: String,
        required: true
    }
});

export const farmaciasLocalidades = mongoose.model('farmaciasLocalidades', farmaciasLocalidadesSchema, 'farmaciasLocalidades');
export const farmaciasTurnos = mongoose.model('farmaciasTurnos', farmaciasTurnosSchema, 'farmaciasTurnos');
