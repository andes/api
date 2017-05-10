import * as mongoose from 'mongoose';
import { llaveEdad } from './llaveEdad';

export let llaveSchema = new mongoose.Schema({
    edad: {
        desde: llaveEdad,
        hasta: llaveEdad
    },
    sexo: {
        type: String,
        enum: [ 'femenino', 'masculino', 'otro', '' ]
    },
    solicitud: {
        requerida: Boolean,
        vencimiento: Date
    }
});
