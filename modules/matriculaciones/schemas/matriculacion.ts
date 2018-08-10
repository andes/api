import * as mongoose from 'mongoose';

let matriculacionSchena = new mongoose.Schema({
    turno: { type: mongoose.Schema.Types.ObjectId, ref: 'turno' },
    aprobado: { type: Boolean, default: false },
    supervisor: { type: String, required: false }
});

// Virtuals


let matriculacion = mongoose.model('matriculacion', matriculacionSchena, 'matriculacion');

export = matriculacion;
