import { OrganizacionSchema } from './../../../core/tm/schemas/organizacion';
import { tipoPrestacionSchema } from './../../../core/tm/schemas/tipoPrestacion';
import { profesionalSchema } from './../../../core/tm/schemas/profesional';
import * as turnoSchema from '../../../modules/turnos/schemas/turno';
import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let PrestacionSolicitudHistorialschema = new mongoose.Schema({
    tipoPrestacion: tipoPrestacionSchema,
    turno: turnoSchema,
    organizacion: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    profesional: profesionalSchema,
    accion: {
        type: String,
        enum: ['liberacionTurno', 'asignacionProfesional', 'referencia']
    }
});

// Habilitar plugin de auditoría
PrestacionSolicitudHistorialschema.plugin(AuditPlugin);
