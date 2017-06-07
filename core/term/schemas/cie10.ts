import * as mongoose from 'mongoose';

export let cie10Schema = new mongoose.Schema({
    causa: String,
    subcausa: String,
    codigo: String,
    nombre: String,
    sinonimo: String,
    c2: Boolean
});

export let model = mongoose.model('cie10', cie10Schema, 'cie10');
