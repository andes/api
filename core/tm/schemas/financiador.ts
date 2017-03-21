import * as mongoose from 'mongoose';

let financiadorSchema = new mongoose.Schema({
    nombre: String
});
let financiador = mongoose.model('financiador', financiadorSchema, 'financiador');
export = financiador;
