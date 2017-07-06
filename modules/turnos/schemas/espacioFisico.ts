import * as mongoose from 'mongoose';
import * as edificioSchema from '../../../core/tm/schemas/edificio';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

export let espacioFisicoSchema = new mongoose.Schema({
    nombre: String,
    detalle: String,
    descripcion: String,
    edificio: edificioSchema,
    sector: nombreSchema,
    servicio: nombreSchema,
    activo: Boolean
});

export let espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
