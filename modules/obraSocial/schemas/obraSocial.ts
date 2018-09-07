import * as mongoose from 'mongoose';

const obraSocialSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigoPuco: Number,
    nombre: String
});

export let obraSocial: any = mongoose.model('obraSocial', obraSocialSchema, 'obraSocial');

