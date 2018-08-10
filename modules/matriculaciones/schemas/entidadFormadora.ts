import * as mongoose from 'mongoose';

let entidadFormadoraSchema = new mongoose.Schema({
    nombre: String,
    codigoSISA: Number
});

// Virtuals


let entidadFormadora = mongoose.model('entidadFormadora', entidadFormadoraSchema, 'entidadFormadora');

export = entidadFormadora;
