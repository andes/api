import * as mongoose from 'mongoose';

let profeSchema = new mongoose.Schema({
    nombre: String,
    tipoDocumento: String,
    dni: Number,
    fechaAlta: Date,
    version: Date
});

export let profe: any = mongoose.model('profe', profeSchema, 'profe');
