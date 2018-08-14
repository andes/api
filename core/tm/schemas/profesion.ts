import * as mongoose from 'mongoose';

const profesionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipoDeFormacion : {type: String, required: true  },
    codigoSISA: Number
});


export = profesionSchema;
