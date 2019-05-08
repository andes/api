import * as mongoose from 'mongoose';
import { CONTACTO } from './constantes';

export const ContactoSchema = new mongoose.Schema({
    tipo: CONTACTO,
    valor: String,
    ranking: Number, // Specify preferred order of use (1 = highest)
    ultimaActualizacion: Date,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
});
