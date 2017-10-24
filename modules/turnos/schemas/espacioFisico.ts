import { SnomedConcept } from './../../rup/schemas/snomed-concept';
import * as mongoose from 'mongoose';
import * as edificioSchema from '../../../core/tm/schemas/edificio';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

export let espacioFisicoSchema = new mongoose.Schema({
    nombre: String,
    detalle: String,
    descripcion: String,
    organizacion: {type: nombreSchema},
    edificio: {type: edificioSchema},
    sector: {type: nombreSchema},
    servicio: {type: nombreSchema},
    equipamiento: [SnomedConcept],
    activo: Boolean,
    estado: {
        type: String,
        enum: ['disponible', 'mantenimiento', 'clausurado', 'baja permanente']
    }
});

export let espacioFisico = mongoose.model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
