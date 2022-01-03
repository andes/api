import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const turnoSchema = new mongoose.Schema({
    fecha: { type: Date, required: true },
    tipo: {
        type: String,
        enum: ['matriculacion', 'renovacion']
    },
    notificado: { type: Boolean, default: false },
    sePresento: { type: Boolean, default: false },
    profesional: { type: mongoose.Schema.Types.ObjectId, ref: 'turnoSolicitado' },
    anulado: Boolean
});

// Virtuals

turnoSchema.plugin(AuditPlugin);
const turno = mongoose.model('turnoMatriculaciones', turnoSchema, 'turno');

export = turno;
