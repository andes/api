import * as mongoose from 'mongoose';

export const FinanciadorSchema = new mongoose.Schema({
    codigoPuco: Number,
    nombre: String,
    financiador: String,
    id: mongoose.Schema.Types.ObjectId,
    numeroAfiliado: String,
    prepaga: Boolean,
    idObraSocial: Number
});
