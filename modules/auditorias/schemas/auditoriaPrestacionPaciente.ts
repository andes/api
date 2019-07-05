import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
// import { llaveTipoPrestacionSchema } from '../../../modules/llaves/schemas/llaveTipoPrestacion';
// import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
// import { prestacionPacienteSchema } from '../../../modules/rup/schemas/prestacionPaciente';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

// Exportar Schema
export let auditoriaPrestacionPacienteSchema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    auditor: { type: profesionalSchema },
    estado: {
        type: String,
        enum: ['pendiente', 'aprobada', 'desaprobada'],
        required: true,
        default: 'pendiente'
    },
});
// Habilitar plugin de auditoría
auditoriaPrestacionPacienteSchema.plugin(AuditPlugin);

auditoriaPrestacionPacienteSchema.index({ 'auditor.documento': 1 });

// Exportar Model
export let auditoriaPrestacionPaciente = mongoose.model('auditoriaPrestacionPaciente', auditoriaPrestacionPacienteSchema, 'auditoriaPrestacionPaciente');
