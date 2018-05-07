import * as mongoose from 'mongoose';

let pucoSchema = new mongoose.Schema({
    tipoDocumento: String,
    dni: Number,
    transmite: String,
    nombre: String,
    codigoFinanciador: Number,
    financiador: String
});

export let puco = mongoose.model('puco', pucoSchema, 'puco');