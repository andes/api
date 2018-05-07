import * as mongoose from 'mongoose';

let profeSchema = new mongoose.Schema({
    nombre: String,
    tipoDocumento: String,
    dni: Number,
});

export let profe = mongoose.model('profe', profeSchema, 'profe');
