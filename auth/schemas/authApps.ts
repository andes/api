import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    activo: Boolean,
    nombre: String,
    organizacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organizacion'
    },
    permisos: [String]
});

export let authUsers = mongoose.model('authApps', schema, 'authApps');
