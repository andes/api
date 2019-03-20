import * as mongoose from 'mongoose';


export let schema = new mongoose.Schema({
    codigo: {
        type: Number,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    capitulo: {
        type: String,
        required: true
    }
});

export let model = mongoose.model('procedimientosQuirurgicos', schema, 'procedimientosQuirurgicos');
