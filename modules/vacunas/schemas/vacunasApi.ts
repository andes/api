import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    idvacuna: Number,
    codigo: String,
    documento: String,
    apellido: String,
    nombre: String,
    fechaNacimiento: Date,
    sexo: {
        type: String,
        enum: ['masculino', 'femenino']
    },
    vacuna: String,
    dosis: String,
    fechaAplicacion: Date,
    efector: String,
    esquema: String,
    condicion: String
});

export let vacunasApi = mongoose.model('vacunasApi', schema, 'nomivac');
