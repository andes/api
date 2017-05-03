import * as mongoose from 'mongoose';
import * as financiadorSchema from '../../../core/mpi/schemas/financiador';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { pacienteSchema } from '../../../core/mpi/schemas/paciente';
import { llaveSchema } from './llave';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as constantes from '../../../core/mpi/schemas/constantes';

let permisos = 'configTipoPrestacion:prestaciones:';

// Exportar Schema
export let configTipoPrestacionSchema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    tipoPrestacion: tipoPrestacionSchema,
    llave: llaveSchema
});

// Habilitar plugin de auditoría
configTipoPrestacionSchema.plugin(require('../../../mongoose/audit'));

// Exportar Model
export let configTipoPrestacion = mongoose.model('configTipoPrestacion', configTipoPrestacionSchema, 'configTipoPrestacion');
