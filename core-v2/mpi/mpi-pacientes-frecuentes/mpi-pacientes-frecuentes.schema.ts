
import * as mongoose from 'mongoose';

export const MPIPacientesFrecuentesSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'authUser'
    },
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'paciente'
    },
    ultimoAcceso: Date,
    cantidad: Number
});

export const MpiPacienteFrecuente = mongoose.model('mpiPacientesFrecuentes', MPIPacientesFrecuentesSchema, 'mpiPacientesFrecuentes');
