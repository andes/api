import * as mongoose from 'mongoose';
import * as constantes from './constantes';

let schema = new mongoose.Schema({
    tipo: constantes.CONTACTO,
    valor: String,
    ranking: Number, // Specify preferred order of use (1 = highest)
    ultimaActualizacion: Date,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
});
export = schema;
