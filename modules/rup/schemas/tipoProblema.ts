import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';

export let tipoProblemaSchema = new mongoose.Schema({
    nombre: String,
    tipo: String,
    descripcion: String,
    codigo: [codificadorSchema],
    activo: Boolean
});

export let tipoProblema = mongoose.model('tipoProblema', tipoProblemaSchema, 'tipoProblema');
