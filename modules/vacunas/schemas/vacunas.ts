import * as mongoose from 'mongoose';

export const vacunasSchema = new mongoose.Schema({
    idvacuna: Number,
    codigo: String,
    vacuna: String,
    esquema: String,
    condicion: String,
    dosis: String,
    ordenDosis: Number,
    fechaAplicacion: Date,
    documento: String,
    apellido: String,
    nombre: String,
    fechaNacimiento: Date,
    sexo: {
        type: String,
        enum: ['masculino', 'femenino']
    },
    codigoEsquema: Number,
    codigoCondicion: Number,
    efector: String
});

vacunasSchema.index({ documento: 1 });
vacunasSchema.index({ idvacuna: 1 });

export const vacunas = mongoose.model('vacunas', vacunasSchema, 'nomivac');
