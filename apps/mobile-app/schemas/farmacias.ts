import * as mongoose from 'mongoose';

export let FarmaciasTurnosSchema = new mongoose.Schema({
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

export let FarmaciasLocalidadesSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    localidadId: {
        type: String,
        required: true
    }
});

export let FarmaciasLocalidades = mongoose.model('farmaciasLocalidades', FarmaciasLocalidadesSchema, 'farmaciasLocalidades');
export let FarmaciasTurnos = mongoose.model('farmaciasTurnos', FarmaciasTurnosSchema, 'farmaciasTurnos');
