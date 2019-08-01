import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

let notificationLogSchema: mongoose.Schema = new mongoose.Schema({
    idTurno: {
        type: mongoose.Schema.Types.ObjectId,
        // unique: true
    },
    fechaHoraTurno: Date,
    paciente: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        nombre: String,
        apellido: String,
        telefono: String,
    },
    profesionales: [{
        nombre: String,
        apellido: String,
    }],
    estado: {
        type: String,
        enum: ['pendiente', 'enviado', 'fallido']
    },
    tipoPrestacion: tipoPrestacionSchema,
    organizacion: nombreSchema,
    errorMsg: String,
});

export let notificationLog = mongoose.model('notificationLog', notificationLogSchema, 'notificationLog');
