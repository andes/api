import * as mongoose from 'mongoose';

var profesionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipoDeFormacion : {type: String, required: true  },
    codigo: Number
});



export = profesionSchema;
