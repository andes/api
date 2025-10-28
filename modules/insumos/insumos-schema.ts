import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';


export const insumoSchema = new mongoose.Schema({
    insumo: String,
    tipo: {
        type: String,
        enum: ['dispositivo', 'nutricion', 'magistral']
    },
    requiereEspecificacion: Boolean
});


insumoSchema.plugin(AuditPlugin);

export const Insumo = mongoose.model('insumo', insumoSchema, 'insumo');
