// import * as mongoose from 'mongoose';

export let rangoTiempo = {
    valor: Number,
    unidad: {
        type: String,
        enum: [ 'Años', 'Meses', 'Días', 'Horas' ]
    }
};
