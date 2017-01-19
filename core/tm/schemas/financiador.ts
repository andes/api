import * as mongoose from 'mongoose';

var financiadorSchema = new mongoose.Schema({
    nombre: String
});

var financiador = mongoose.model('financiador', financiadorSchema, 'financiador');

export = financiador;