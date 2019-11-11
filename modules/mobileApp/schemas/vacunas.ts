import * as mongoose from 'mongoose';

export let vacunasSchema = new mongoose.Schema({
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

vacunasSchema.index({ documento: 1 });
vacunasSchema.index({ idvacuna: 1 });

export let vacunas = mongoose.model('vacunas', vacunasSchema, 'nomivac');
