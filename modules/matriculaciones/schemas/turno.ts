import * as mongoose from 'mongoose';

const turnoSchena = new mongoose.Schema({
    fecha: { type: Date, required: true },
    tipo: {
        type: String,
        enum: ['matriculacion', 'renovacion']
    },
    notificado: { type: Boolean, default: false },
    sePresento: { type: Boolean, default: false },
    profesional: { type: mongoose.Schema.Types.ObjectId, ref: 'turnoSolicitado' },
    anulado: Boolean,
    updatedBy: {
        required: false,
        usuario: {
            id: String,
            nombre: String,
            apellido: String,
            documento: String,
            username: String
        },
        organizacion: {
            id: String,
            nombre: String
        }
    }
});

// Virtuals


const turno = mongoose.model('turnoMatriculaciones', turnoSchena, 'turno');

export = turno;
