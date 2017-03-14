import * as mongoose from 'mongoose';
import * as ubicacionSchema from '../../../core/tm/schemas/ubicacion';
import * as edificioSchema from '../../../core/tm/schemas/edificio';

export var espacioFisicoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    //organizacion: xxxx
    edificio: edificioSchema,
    detalle: String,
    activo: Boolean
});

export var espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
