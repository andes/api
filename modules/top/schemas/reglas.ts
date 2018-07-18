import * as mongoose from 'mongoose';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';

let reglasSchema = new mongoose.Schema({
    origen: {
        organizacion: String,
        prestacion: String
    },
    destino: {
        organizacion: String,
        prestacion: String,
        profesionales: [profesionalSchema]

    },
    auditable: Boolean,
});

export let reglas = mongoose.model('reglas', reglasSchema, 'reglas');
