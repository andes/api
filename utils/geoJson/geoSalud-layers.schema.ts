import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Schema, model } from 'mongoose';

export const GeoSaludLayerSchema = new Schema({

    nombre: {
        type: String,
        required: true
    },

    URL: {
        type: String,
        required: true
    }
});

GeoSaludLayerSchema.plugin(AuditPlugin);

export const GeoSaludLayer = model('geoSalud-layers', GeoSaludLayerSchema, 'geoSalud-layers');
