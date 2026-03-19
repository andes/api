import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const insumoSchema = new mongoose.Schema({
    nombre: String,
    codigo: [{
        fuente: { type: String, enum: ['SIFAHO', 'SNOMED'] },
        valor: String
    }],
    tipo: {
        type: String,
        enum: ['dispositivo', 'nutricion', 'magistral']
    },
    estado: {
        type: String,
        enum: ['activo', 'inactivo']
    },
    requiereEspecificacion: Boolean,
    observaciones: String
});


insumoSchema.plugin(AuditPlugin);

export const Insumo = mongoose.model('insumos', insumoSchema, 'insumos');
