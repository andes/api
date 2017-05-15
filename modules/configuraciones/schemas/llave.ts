import * as mongoose from 'mongoose';
import { rangoTiempo } from './rangoTiempo';

export let llaveSchema = new mongoose.Schema({
    edad: {
        desde: rangoTiempo,
        hasta: rangoTiempo
    },
    sexo: {
        type: String,
        enum: [ 'femenino', 'masculino', 'otro', '' ]
    },
    solicitud: {
        requerida: Boolean,
        vencimiento: rangoTiempo
    }
});
