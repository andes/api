import * as mongoose from 'mongoose';

export const NombreApellidoSchema = new mongoose.Schema({
    nombre: String,
    apellido: String
});
