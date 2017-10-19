// import * as mongoose from 'mongoose';

export let rangoTiempo = {
    valor: Number,
    unidad: {
        type: String,
        enum: ['años', 'meses', 'días', 'horas']
    }
};
