import * as mongoose from 'mongoose';


export const schema = new mongoose.Schema({
    codigo: {
        type: String,
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

export const model = mongoose.model('procedimientosQuirurgicos', schema, 'procedimientosQuirurgicos');
