import * as mongoose from 'mongoose';

export let mailGestionSchema = new mongoose.Schema({
    direccion: String,
    nombreCompleto: String,
    alerta: Boolean,
});

export let mailGestionModel = mongoose.model('mailContactoGestion', mailGestionSchema, 'mailContactoGestion');
