import * as mongoose from 'mongoose';

export let llaveEdad = {
    valor: Number,
    unidad: {
        type: String,
        enum: [ 'Años', 'Meses', 'Días', 'Horas' ]
    }
};
