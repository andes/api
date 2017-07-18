import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    usuario: Number,
    activo: Boolean,
    nombre: String,
    apellido: String,
    password: String,
    foto: String,
    organizacion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'organizacion'
        },
    roles: [String],
    permisos: [String]
});

export let model = mongoose.model('permisos', schema, 'authPermisos');
