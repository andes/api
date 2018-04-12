import * as mongoose from 'mongoose';

let obraSocialSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigoPuco: Number,
    nombre: String
});

export let obraSocial = mongoose.model('obraSocial', obraSocialSchema, 'obraSocial');

