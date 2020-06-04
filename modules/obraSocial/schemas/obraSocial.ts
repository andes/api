import * as mongoose from 'mongoose';

export const ObraSocialSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigoPuco: Number,
    nombre: String,
    financiador: String,
    prepaga: { type: Boolean, required: false },
    idObraSocial: { type: Number, required: false },
    numeroAfiliado: { type: String, required: false }
});

ObraSocialSchema.index({ codigoPuco: 1 });

export let ObraSocial: any = mongoose.model('obraSocial', ObraSocialSchema, 'obraSocial');

