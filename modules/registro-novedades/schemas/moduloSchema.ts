import * as mongoose from 'mongoose';

export const ModuloAndesSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    descripcion: String
});

export let ModuloAndes = mongoose.model('ModuloAndes', ModuloAndesSchema, 'moduloAndes');
