import * as mongoose from 'mongoose';
import { pacienteSchema } from '../../../core/mpi/schemas/paciente';

export let recordatorioSchema = new mongoose.Schema({
    paciente: {
        id: mongoose.Schema.Types.ObjectId,
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