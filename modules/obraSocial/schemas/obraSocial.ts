import * as mongoose from 'mongoose';

export const ObraSocialSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigoPuco: Number,
    nombre: String,
    financiador: String,
    prepaga: Boolean,
    idObraSocial: Number
});

ObraSocialSchema.index({ codigoPuco: 1 });

export let ObraSocial: any = mongoose.model('obraSocial', ObraSocialSchema, 'obraSocial');

