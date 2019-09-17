import * as mongoose from 'mongoose';

export let mailContactoGestionSchema = new mongoose.Schema({

    direccion: {
        type: String,
        required: true
    },
    nombreContacto: {
        type: String,
        required: true
    },
});

export let MailContactoGestion = mongoose.model('mailContactoGestion', mailContactoGestionSchema, 'mailContactoGestion');
