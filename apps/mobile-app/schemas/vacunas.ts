import * as mongoose from 'mongoose';

export let VacunasSchema = new mongoose.Schema({
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

export let Vacunas = mongoose.model('vacunas', VacunasSchema, 'nomivac');
