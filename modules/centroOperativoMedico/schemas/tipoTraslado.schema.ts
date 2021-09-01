import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const TipoTrasladoSchema = new mongoose.Schema({
    nombre: String
});

TipoTrasladoSchema.plugin(AuditPlugin);
export const TipoTraslado = mongoose.model('tipoTraslado', TipoTrasladoSchema, 'tipoTraslado');
