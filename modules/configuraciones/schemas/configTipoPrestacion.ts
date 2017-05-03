import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { llaveSchema } from './llave';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';

let permisos = 'configTipoPrestacion:prestaciones:';

// Exportar Schema
export let configTipoPrestacionSchema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    tipoPrestacion: tipoPrestacionSchema,
    llave: llaveSchema,
    activa: Boolean
});

// Habilitar plugin de auditoría
configTipoPrestacionSchema.plugin(require('../../../mongoose/audit'));

// Exportar Model
export let configTipoPrestacion = mongoose.model('configTipoPrestacion', configTipoPrestacionSchema, 'configTipoPrestacion');
