import * as mongoose from 'mongoose';
import { pacienteSchema } from '../../../core/mpi/schemas/paciente';

export let recordatorioSchema = new mongoose.Schema({
    idTurno: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true
    },
    fechaTurno: Date,
    paciente: {
        nombre: String,
        apellido: String,
        telefono: String,
    },
    estadoEnvio: Boolean,
    tipoRecordatorio: {
        type: String,
        enum: ['turno', 'agenda']
    }
});

export let recordatorio = mongoose.model('recordatorio', recordatorioSchema, 'recordatorio');