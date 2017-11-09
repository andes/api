import * as mongoose from 'mongoose';

var profesionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigoSISA: Number    
});



export = profesionSchema;
