import { model, Schema, SchemaTypes } from 'mongoose';

export const AreaProgramaProvincialSchema = new Schema(
    {
        nombre: String,
        codLocalidad: String,
        zona: {
            id: SchemaTypes.ObjectId,
            nombre: String,
        },
        areaPrograma: String,
        idLocalidad: SchemaTypes.ObjectId

    });

export const AreaProgramaProvincial = model('area-programa-provincial', AreaProgramaProvincialSchema, 'area-programa-provincial');
