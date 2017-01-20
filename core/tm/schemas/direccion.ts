import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';

var schema = new mongoose.Schema({
    valor: String,
    codigoPostal: String,
    ubicacion: ubicacionSchema,
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

    // REVISAR
    ultimaActualizacion: Date,
});

export = schema;
