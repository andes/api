import * as mongoose from 'mongoose';
import * as constantes from '../../../core/mpi/schemas/constantes';

export let llaveSchema = new mongoose.Schema({
    edad: {
        desde: Number,
        hasta: Number
    },
    sexo: constantes.SEXO,
    solicitud: {
        requerida: Boolean,
        vencimiento: Date
    }
});
