import * as mongoose from 'mongoose';

let pucoSchema = new mongoose.Schema({
    tipoDocumento: String,
    dni: Number,
    transmite: String,
    nombre: String,
    codigoFinanciador: Number,
    financiador: String,
    version: Date
});

export let puco: any = mongoose.model('puco', pucoSchema, 'puco');
