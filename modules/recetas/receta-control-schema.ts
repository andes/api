import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';

export const recetaControlSchema = new mongoose.Schema({
    idPrestacion: {
        type: String,
        required: true
    },
    idRegistro: {
        type: String,
        required: true
    },
    idPaciente: {
        type: String,
        required: true
    },
    tipoPrescripcion: {
        type: String,
        enum: ['medicamento', 'insumos', 'magistrales'],
        required: true
    },
    creada: {
        type: Boolean,
        default: false,
        required: true
    },
    idReceta: {
        type: String,
        required: false
    },
    conceptId: {
        type: String,
        required: false
    },
    insumoId: {
        type: String,
        required: false
    },
    ordenTratamiento: {
        type: Number,
        required: false
    }
});

recetaControlSchema.plugin(AuditPlugin);

recetaControlSchema.index({ idPrestacion: 1 });
recetaControlSchema.index({ idRegistro: 1 });
recetaControlSchema.index({ idPaciente: 1 });

export const RecetaControl = mongoose.model('recetaControl', recetaControlSchema, 'recetaControl');
