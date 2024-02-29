import * as mongoose from 'mongoose';
import { ModuloSchema } from '../../core/tm/schemas/modulos.schema';

export const NovedadSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    fecha: { type: Date, default: Date.now },
    titulo: String,
    palabra: String,
    descripcion: String,
    modulo: {
        type: ModuloSchema
    },
    imagenes: mongoose.Schema.Types.Mixed,
    activa: Boolean
});

export const Novedades = mongoose.model('novedades', NovedadSchema, 'novedades');
