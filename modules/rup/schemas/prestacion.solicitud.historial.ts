import { tipoPrestacionSchema } from './../../../core/tm/schemas/tipoPrestacion';
import { profesionalSchema } from './../../../core/tm/schemas/profesional';
import * as turnoSchema from '../../../modules/turnos/schemas/turno';
import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let PrestacionSolicitudHistorialschema = new mongoose.Schema({
    accion: String,
    descripcion: String,
    profesional: profesionalSchema,
    tipoPrestacion: tipoPrestacionSchema,
    turno: mongoose.Schema.Types.ObjectId,
    organizacion: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    observaciones: String
});

// Habilitar plugin de auditoría
PrestacionSolicitudHistorialschema.plugin(AuditPlugin);
