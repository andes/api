import * as mongoose from 'mongoose';

var entidadFormadoraSchema = new mongoose.Schema({
    nombre: String,
    codigoSISA: Number
});

//Virtuals


var entidadFormadora = mongoose.model('entidadFormadora', entidadFormadoraSchema, 'entidadFormadora');

export = entidadFormadora;
