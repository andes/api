import * as mongoose from 'mongoose';
import { ModuloSchema } from '../../core/tm/schemas/modulos.schema';

export const restriccionHudsSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    fecha: { type: Date, default: Date.now },
    titulo: String,
    descripcion: String,
    modulo: {
        type: ModuloSchema
    },
    imagenes: mongoose.Schema.Types.Mixed,
    activa: Boolean
});

export const restriccionHuds = mongoose.model('restriccionHuds', restriccionHudsSchema, 'restriccionHuds');
