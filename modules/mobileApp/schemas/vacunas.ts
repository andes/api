import * as mongoose from 'mongoose';

export let vacunasSchema = new mongoose.Schema({
    idvacuna: Number,
    codigo: String,
    vacuna: String,
    codigoEsquema: String,
    codigoCondicion: String,
    dosis: Number,
    fechaAplicacion: Date,
    documento: String,
    apellido: String,
    nombre: String,
    fechaNacimiento: Date,
    sexo: {
        type: String,
        enum: ['masculino', 'femenino']
    },
    efector: {
        codigo: String,
        nombre: String
    }
});

vacunasSchema.index({ documento: 1 });
vacunasSchema.index({ idvacuna: 1 });

export let vacunas = mongoose.model('vacunas', vacunasSchema, 'nomivac');
