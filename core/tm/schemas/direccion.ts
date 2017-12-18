import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';

let schema = new mongoose.Schema({
    valor: String,
    codigoPostal: String,
    ubicacion: { type: ubicacionSchema},
    geoReferencia: {
        type: [Number],
        index: '2d'
    },
    ranking: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    ultimaActualizacion: Date,
});

export = schema;
