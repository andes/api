import { model, Schema } from 'mongoose';
import { SnomedConcept } from './../../../../modules/rup/schemas/snomed-concept';

export let schema = new Schema({
    laboratorioDestino: {
        nombre: { type: String, required: true },
        id: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true }
    },
    concepto: { type: SnomedConcept, required: true }
});
schema.plugin(require('../../../../mongoose/audit'));

export let ConfiguracionDerivacion = model('configuracionDerivacion', schema, 'configuracionDerivacion');
