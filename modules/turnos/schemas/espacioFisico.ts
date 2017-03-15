import * as mongoose from 'mongoose';
import * as edificioSchema from '../../../core/tm/schemas/edificio';
import * as organizacion from '../../../core/tm/schemas/organizacion';

export let espacioFisicoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    organizacion: organizacion.schema,
    edificio: edificioSchema,
    detalle: String,
    activo: Boolean
});

export let espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
