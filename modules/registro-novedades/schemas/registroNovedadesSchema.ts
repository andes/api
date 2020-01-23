import * as mongoose from 'mongoose';
import { ModuloAndesSchema } from './moduloSchema';

export const RegistroNovedadesSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    // subscriptionId: mongoose.SchemaTypes.ObjectId,
    fecha: { type: Date, default: Date.now },
    titulo: String,
    descripcion: String,
    modulo: ModuloAndesSchema,
    imagenes: mongoose.Schema.Types.Mixed,
    activa: Boolean, // ver si debería ser activa por defecto
    headers: mongoose.SchemaTypes.Mixed, // for Token AUTH
    response: mongoose.SchemaTypes.Mixed,
    body: mongoose.SchemaTypes.Mixed, // a projections of data to send
    // updatedAt: Date
});

export let RegistroNovedades = mongoose.model('RegistroNovedades', RegistroNovedadesSchema, 'registroNovedad');
