import * as mongoose from 'mongoose';

let turnoSchena = new mongoose.Schema({
    fecha: { type: Date, required: true },
    tipo: {
        type: String,
        enum: ['matriculacion', 'renovacion']
    },
    sePresento: { type: Boolean, default: false },
    profesional: { type: mongoose.Schema.Types.ObjectId, ref: 'profesionalM' }
});

// Virtuals


let turno = mongoose.model('turno', turnoSchena, 'turno');

export = turno;
