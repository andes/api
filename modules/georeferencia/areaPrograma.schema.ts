import * as mongoose from 'mongoose';

export const AreaProgramaSchema = new mongoose.Schema(
    {
        nombre:  mongoose.SchemaTypes.Mixed,
        geometry: {
            type: { type: String },
            coordinates: []
        },
        sisaOrganizacion: String
    }
);

export const AreaPrograma = mongoose.model('area-programa', AreaProgramaSchema, 'area-programa');
