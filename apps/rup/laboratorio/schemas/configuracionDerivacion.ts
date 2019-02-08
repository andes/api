import { model, Schema } from 'mongoose';
import { SnomedConcept } from './../../../../modules/rup/schemas/snomed-concept';

export let schema = new Schema({
    laboratorioDestino: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true },
    concepto: SnomedConcept
});
schema.plugin(require('../../../../mongoose/audit'));

export let Practica = model('configuracionDerivacion', schema, 'configuracionDerivacion');
