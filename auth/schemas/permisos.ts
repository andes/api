import * as mongoose from 'mongoose';

const schema = new mongoose.Schema({
    usuario: Number,
    activo: Boolean,
    nombre: String,
    apellido: String,
    password: String,
    foto: String,
    organizaciones: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'organizacion'
        },
        permisos: [String],
        activo: {
            type: Boolean,
            default: true
        }
    }]
});

export let authUsers = mongoose.model('authUsers', schema, 'authUsers');
