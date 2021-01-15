import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../core/tm/schemas/tipoPrestacion';

export const ModificadoresSchema: mongoose.Schema = new mongoose.Schema({

    tipoPrestacion: tipoPrestacionSchema,
    condicionesPaciente: [{
        edad: {
            min: Number,
            max: Number
        },
        fuente: {
            tipo: String,
            ruta: String
        },
        sexo: String,
        ubicacion: {
            tipo: String,
            nombre: String
        }
    }]
});

export const Modificadores = mongoose.model('modificadores', ModificadoresSchema, 'modificadores');
