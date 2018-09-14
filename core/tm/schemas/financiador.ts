import * as mongoose from 'mongoose';

const financiadorSchema = new mongoose.Schema({
    nombre: String
});
const financiador = mongoose.model('financiador', financiadorSchema, 'financiador');
export = financiador;
