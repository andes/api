import * as mongoose from 'mongoose';

var consultorioSchema = new mongoose.Schema({   
    nombre: {
        type: String,
        required: true
    },
    descripcion: String
});

var consultorio = mongoose.model('consultorio', consultorioSchema, 'consultorio');

export = consultorio;