import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';

export const DispositivoSchema = new mongoose.Schema({
    nombre: String,
    activo: Boolean,
    tipo: String,
    descripcion: String,
    icono: String
});

DispositivoSchema.plugin(AuditPlugin);
export const Dispositivo = mongoose.model('dispositivo', DispositivoSchema, 'dispositivo');
