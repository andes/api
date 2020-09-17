import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';


const schema = new mongoose.Schema({
    tipo: {
        type: String,
        required: false
    },
    valor: String,
    codigoPostal: String,
    ubicacion: { type: ubicacionSchema },
    geoReferencia: {
        type: [Number]
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
