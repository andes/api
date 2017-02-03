import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';

var tipoProblemaSchema = new mongoose.Schema({
    nombre: String,
    tipo: String,
    descripcion: String,
    codigo: [codificadorSchema],
    activo: Boolean
});

var tipoProblema = mongoose.model('tipoProblema', tipoProblemaSchema, 'tipoProblema');

export = tipoProblema;