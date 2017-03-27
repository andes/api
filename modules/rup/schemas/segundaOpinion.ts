import * as mongoose from 'mongoose';

export var segundaOpinionSchema = new mongoose.Schema({
    //usuario: usuarioSchema 
    texto: String,
    fechaRealizacion: Date
});