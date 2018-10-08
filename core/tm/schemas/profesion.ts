import * as mongoose from 'mongoose';

const profesionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipoDeFormacion : {type: String, required: true  },
    codigo: Number,
    profesionCodigoRef: Number
});


export = profesionSchema;
