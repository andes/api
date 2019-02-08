import { model, Schema } from 'mongoose';
import { SnomedConcept } from './../../../../modules/rup/schemas/snomed-concept';

export let schema = new Schema({
    laboratorioDestino: {
        nombre: String,
        id: { type: Schema.Types.ObjectId, ref: 'organizacion' }
    },
    concepto: SnomedConcept
});
schema.plugin(require('../../../../mongoose/audit'));

export let ConfiguracionDerivacion = model('configuracionDerivacion', schema, 'configuracionDerivacion');
