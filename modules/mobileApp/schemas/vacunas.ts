import * as mongoose from 'mongoose';

export let vacunasSchema = new mongoose.Schema({
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

export let vacunas = mongoose.model('vacunas', vacunasSchema, 'nomivac');
