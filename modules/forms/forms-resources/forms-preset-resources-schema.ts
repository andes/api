import * as mongoose from 'mongoose';

export const FormPresetResourcesSchema = new mongoose.Schema({
    activo: {
        type: Boolean,
        default: false
    },
    nombre: String,
    id: String,
    preset: String,
    type: {
        type: String,
        default: 'normal'
    },
    fields: [{ type: mongoose.SchemaTypes.Mixed }]
});

export const FormPresetResource = mongoose.model('formPresetResources', FormPresetResourcesSchema, 'formPresetResources');
