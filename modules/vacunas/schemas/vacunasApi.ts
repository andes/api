import { model, Schema } from 'mongoose';

export let schema = new Schema({
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
});

export let vacunasApi = model('vacunasApi', schema, 'nomivac');
