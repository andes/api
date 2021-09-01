import * as mongoose from 'mongoose';

const schema = new mongoose.Schema({
    activo: Boolean,
    nombre: String,
    organizacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organizacion'
    },
    permisos: [String],
    token: String
});

export const authApps = mongoose.model('authApps', schema, 'authApps');
