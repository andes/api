import * as mongoose from 'mongoose';

export let configuracionPantallaSchema = new mongoose.Schema({

    nombrePantalla: String,
    prestaciones: Array
});

export let configuracionPantalla = mongoose.model('configuracionPantalla', configuracionPantallaSchema, 'configuracionPantalla');
