import * as mongoose from 'mongoose';
const _financiadorSchema = new mongoose.Schema({
    codigoPuco: Number,
    nombre: String,
    financiador: String,
    id: mongoose.Schema.Types.ObjectId,
    numeroAfiliado: String
    // entidad: {
    //     id: mongoose.Schema.Types.ObjectId,
    //     nombre: String
    // },
    // codigo: String,
    // activo: Boolean,
    // fechaAlta: Date,
    // fechaBaja: Date,
    // ranking: Number,
    // numeroAfiliado: String
});

