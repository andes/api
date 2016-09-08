import * as mongoose from 'mongoose';

var provinciaSchema = new mongoose.Schema({
    nombre: String,
    localidades: [{
        nombre: String,
        codigoPostal: String                
    }]
});

var provincia = mongoose.model('provincia', provinciaSchema, 'provincia');

export = provincia;