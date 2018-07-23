import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../rup/schemas/snomed-concept';

let reglasSchema = new mongoose.Schema({
    origen: {
        organizacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        prestaciones: [SnomedConcept],
    },
    destino: {
        organizacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        prestacion: SnomedConcept
    }
});

let model = mongoose.model('reglas', reglasSchema, 'reglas');
export = model;
