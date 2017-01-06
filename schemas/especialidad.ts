import * as mongoose from 'mongoose';

var especialidadSchema = new mongoose.Schema({   
     nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    complejidad: Number,
    disciplina: String,
    codigo:{
        sisa: {
            type: String,
            required: true
        }
    },
    habilitado:{
        type: Boolean,
        required : true
    },
    fechaAlta: Date,
    fechaBaja: Date,
    
});

var especialidad = mongoose.model('especialidad', especialidadSchema, 'especialidad');

export = especialidad;
