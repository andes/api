import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import * as atomoSchema from './atomo';

var moleculaSchema = new mongoose.Schema({
    clave: String,
    nombre: String,
    descripcion: String,
    codigo: [codificadorSchema],
    //tipo: String,
    elementos: [
        {
            atomo: atomoSchema,
            molecula: moleculaSchema,
            requerido: Boolean,
            orden: Number
        }
    ],
    componente: String
});

export = moleculaSchema;