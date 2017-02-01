import * as mongoose from 'mongoose';
import * as ubicacionSchema from '../../../core/tm/schemas/ubicacion';
import * as edificioSchema from '../../../core/tm/schemas/edificio';

var espacioFisicoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    edificio: edificioSchema,
    detalle: String,
    activo: Boolean
});

var espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');

export = espacioFisico;