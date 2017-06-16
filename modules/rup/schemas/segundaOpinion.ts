import * as mongoose from 'mongoose';

export let segundaOpinionSchema = new mongoose.Schema({
    // usuario: usuarioSchema
    texto: String,
    fechaRealizacion: Date
});
