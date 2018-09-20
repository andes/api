import * as mongoose from 'mongoose';

const entidadFormadoraSchema = new mongoose.Schema({
    nombre: String,
    codigoSISA: Number
});

// Virtuals


const entidadFormadora = mongoose.model('entidadFormadora', entidadFormadoraSchema, 'entidadFormadora');

export = entidadFormadora;
