import * as mongoose from 'mongoose';

export const FormResourcesSchema = new mongoose.Schema({
    activo: {
        type: Boolean,
        default: false
    },
    nombre: String,
    id: String,
    type: {
        type: String,
        default: 'normal'
    }
});

export const FormResource = mongoose.model('formResources', FormResourcesSchema, 'formResources');
