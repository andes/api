import * as mongoose from 'mongoose';

let codificadorSchema = new mongoose.Schema({
    nombre: String,
    codigo: String,
    jerarquia: String,
    origen: String
});

export = codificadorSchema;