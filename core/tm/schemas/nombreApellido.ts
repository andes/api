import * as mongoose from 'mongoose';

var nombreApellidoSchema = new mongoose.Schema({  
    nombre: String,
    apellido: String
});
export = nombreApellidoSchema;