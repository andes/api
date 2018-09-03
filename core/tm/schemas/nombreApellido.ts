import * as mongoose from 'mongoose';

const nombreApellidoSchema = new mongoose.Schema({
    nombre: String,
    apellido: String
});
export = nombreApellidoSchema;
