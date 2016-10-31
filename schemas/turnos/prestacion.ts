import * as mongoose from 'mongoose';

var prestacionSchema = new mongoose.Schema({   
    nombre: {
        type: String,
        required: true
    },
    activo: Boolean,
    especialidad: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});

var prestacion = mongoose.model('prestacion', prestacionSchema, 'prestacion');

export = prestacion;

