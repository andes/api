import * as mongoose from 'mongoose';

export let vacunasSchema = new mongoose.Schema({
    dni: String,
    apellido: String,
    fechaNacimiento: Date,
    sexo: {
        type: String,
        enum: ['Masculino', 'Femenino']
    },
    vacuna: String,
    dosis: String,
    fechaAplicacion: Date
});

export let vacunas = mongoose.model('vacunas', vacunasSchema, 'nomivac');