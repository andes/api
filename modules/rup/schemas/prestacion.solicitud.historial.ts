import { tipoPrestacionSchema } from './../../../core/tm/schemas/tipoPrestacion';
import { ProfesionalBaseSchema } from './../../../core/tm/schemas/profesional';
import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const PrestacionSolicitudHistorialschema = new mongoose.Schema({
    accion: String,
    descripcion: String,
    profesional: ProfesionalBaseSchema,
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
