import * as mongoose from 'mongoose';

let profesionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipoDeFormacion : {type: String, required: true  },
    codigoSISA: Number
});


export = profesionSchema;
