import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as constantes from './constantes';

export let agendaSipsCacheSchema = new mongoose.Schema({
    paciente: {
        id: mongoose.Schema.Types.ObjectId,
        documento: String,
        nombre: String,
        apellido: String,
        sexo: constantes.SEXO,
        fechaNacimiento: Date
    },
    agenda: {
        estado: String,
        bloque: Object // A definir despues
    },
    turno: {
        organizacion: Object, // Ver si enviamos un objeto o sólo el cuie en cuyo caso cambiaria a STRING
        tipoPrestacion: Object, // Ver si hace falta el schema tipo de prestación u otro
        profesionales: Object, // A definir que esquema usamos
        horaInicio: Date
    },
    createdAt: Date,
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed
});

export let agendaSipsCache = mongoose.model('agendaSipsCache', agendaSipsCacheSchema, 'agendaSipsCache');
