import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';


export const insumoSchema = new mongoose.Schema({
    insumo: String,
    codigo: String,
    tipo: {
        type: String,
        enum: ['dispositivo', 'nutricion', 'magistral']
    },
    estado: {
        type: String,
        enum: ['activo', 'inactivo']
    },
    requiereEspecificacion: Boolean
});


insumoSchema.plugin(AuditPlugin);

export const Insumo = mongoose.model('insumo', insumoSchema, 'insumo');
