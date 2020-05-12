import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    idvacuna: Number,
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
    efector: String
});

export let vacunasApi = mongoose.model('vacunasApi', schema, 'nomivac');
