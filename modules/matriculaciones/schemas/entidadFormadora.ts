import * as mongoose from 'mongoose';

const entidadFormadoraSchema = new mongoose.Schema({
    codigo: Number,
    nombre: String,
    provincia: String,
    habilitado: Boolean,
    codigoSISA: Number
});

// Virtuals


const entidadFormadora = mongoose.model('entidadFormadora', entidadFormadoraSchema, 'entidadFormadora');

export = entidadFormadora;
