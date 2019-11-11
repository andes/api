import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    capitulo: String,
    grupo: String,
    causa: String,
    subcausa: String,
    codigo: String,
    nombre: String,
    sinonimo: String,
    c2: Boolean,
    reporteC2: String,
    ficha: String
});
schema.index({ codigo: 1 });
export let model = mongoose.model('cie10', schema, 'cie10');
