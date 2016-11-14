import * as mongoose from 'mongoose';

var espacioFisicoSchema = new mongoose.Schema({   
    nombre: {
        type: String,
        required: true
    },
    descripcion: String
    // activo: Boolean
});

var espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');

export = espacioFisico;