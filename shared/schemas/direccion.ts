import * as mongoose from 'mongoose';
import {UbicacionSchema} from './ubicacion';

export const DireccionSchema = new mongoose.Schema({
    tipo: {
        type: String,
        required: false
    },
    valor: String,
    codigoPostal: String,
    ubicacion: { type: UbicacionSchema },
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
