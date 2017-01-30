import * as mongoose from 'mongoose';

var codificadorSchema = new mongoose.Schema({
    nombre: String,
    codigo: String,
    jerarquia: String,
    origen: String
});

export = codificadorSchema;