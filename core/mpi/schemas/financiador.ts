import * as mongoose from 'mongoose';
let _financiadorSchema = new mongoose.Schema({
    entidad: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    codigo: String,
    activo: Boolean,
    fechaAlta: Date,
    fechaBaja: Date,
    ranking: Number,

});

