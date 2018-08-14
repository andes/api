import * as mongoose from 'mongoose';
import { ObjSIISASchema } from '../../../core/tm/schemas/siisa';

const cambioDniSchema = new mongoose.Schema({
    apellido: { type: String, required: true },
    nombre: { type: String, required: true },
    idProfesional: { type: String, required: false },
    nacionalidad: { type: ObjSIISASchema, required: false },
    dniActual: { type: String, required: true },
    dniNuevo: { type: String, required: true },
    fecha: { type: Date, required: true },
    atendida: { type: Boolean, required: true },

});

// Virtuals


const cambioDni = mongoose.model('solicitudCambioDni', cambioDniSchema, 'solicitudCambioDni');

export = cambioDni;
