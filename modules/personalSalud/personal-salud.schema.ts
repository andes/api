import * as mongoose from 'mongoose';

export const PersonalSaludSchema: mongoose.Schema = new mongoose.Schema({
    documento: {
        type: String,
        required: true
    },
    apellido: {
        type: String,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    sexo: String,
    fechaNacimiento: Date,
    ocupacion: String
});

export const PersonalSalud = mongoose.model('personalSalud', PersonalSaludSchema, 'personalSalud');
