import * as mongoose from 'mongoose';

export const recordatorioSchema = new mongoose.Schema({
    idTurno: {
        type: mongoose.Schema.Types.ObjectId,
        // unique: true
    },
    fechaTurno: Date,
    paciente: {
        nombre: String,
        apellido: String,
        telefono: String,
    },
    dataAgenda: {
        _id: false,
        profesionalId: mongoose.Schema.Types.ObjectId,
        fecha: Date
    },
    estadoEnvio: Boolean,
    tipoRecordatorio: {
        type: String,
        enum: ['turno', 'agenda']
    }
});

export const recordatorio = mongoose.model('recordatorio', recordatorioSchema, 'recordatorio');
