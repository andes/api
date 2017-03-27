import * as mongoose from 'mongoose';
import * as edificioSchema from '../../../core/tm/schemas/edificio';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

export let espacioFisicoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    organizacion: nombreSchema,
    edificio: edificioSchema,
    detalle: String,
    activo: Boolean
});

export let espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
