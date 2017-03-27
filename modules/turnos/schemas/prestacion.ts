import * as mongoose from 'mongoose';

var prestacionSchema = new mongoose.Schema({   
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    activo: Boolean    
});

//var prestacion = mongoose.model('prestacion', prestacionSchema, 'prestacion');

export = prestacionSchema;

