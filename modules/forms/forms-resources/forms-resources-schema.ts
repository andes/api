import * as mongoose from 'mongoose';

export const FormResourcesSchema = new mongoose.Schema({
    activo: { type: Boolean, default: false },
    nombre: String,
    key: String
});

export const FormResource = mongoose.model('formResources', FormResourcesSchema, 'formResources');
