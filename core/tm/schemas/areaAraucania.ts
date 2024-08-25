import { model, Schema, SchemaTypes } from 'mongoose';

export const areaAraucaniaSchema = new Schema(
    {
        longitud: Number,
        latitud: Number,
        nombre: String,
        region: String,
        comunidad: String,
        complejidad: String,
        direccion: String,
        telefono: String,
    });

export const AreaAraucania = model('area-araucania', areaAraucaniaSchema, 'area-araucania');
