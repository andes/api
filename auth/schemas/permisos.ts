import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    usuario: Number,
    organizacion: mongoose.Types.ObjectId,
    roles: [String],
    permisos: [String]
});

export let model = mongoose.model('permisos', schema, 'authPermisos');
