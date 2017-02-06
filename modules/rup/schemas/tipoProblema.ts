import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';

export var tipoProblemaSchema = new mongoose.Schema({
    nombre: String,
    tipo: String,
    descripcion: String,
    codigo: [codificadorSchema],
    activo: Boolean
});

export var tipoProblema = mongoose.model('tipoProblema', tipoProblemaSchema, 'tipoProblema');