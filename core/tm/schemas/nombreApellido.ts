import * as mongoose from 'mongoose';

let nombreApellidoSchema = new mongoose.Schema({
    nombre: String,
    apellido: String
});
export = nombreApellidoSchema;
