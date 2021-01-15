import * as mongoose from 'mongoose';

export const ModificadoresSchema: mongoose.Schema = new mongoose.Schema({
    fuente: {
        tipo: String,
        ruta: String
    },
    tipoPrestacion: String,
    condicionesPaciente: {
        edad: {
            min: Number,
            max: Number
        },
        sexo: String,
        ubicacion: {
            tipo: String,
            nombre: String
        }
    }
});

export const Modificadores = mongoose.model('modificadores', ModificadoresSchema, 'modificadores');
