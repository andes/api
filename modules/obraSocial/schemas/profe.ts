import * as mongoose from 'mongoose';

export const ProfeSchema = new mongoose.Schema({
    nombre: String,
    tipoDocumento: String,
    dni: Number,
    fechaAlta: Date,
    version: Date
});

export const Profe: any = mongoose.model('profe', ProfeSchema, 'profe');
