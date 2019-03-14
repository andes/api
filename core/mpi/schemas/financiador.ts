import * as mongoose from 'mongoose';
export let financiadorSchema = new mongoose.Schema();

financiadorSchema.add({
    codigoPuco: Number,
    nombre: String,
    financiador: String,
    id: mongoose.Schema.Types.ObjectId,
    numeroAfiliado: String,
    prepaga: Boolean,
    idObraSocial: Number
});

