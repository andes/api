import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { model, Schema  } from 'mongoose';

export let schema = new Schema({
    laboratorioDestino: Schema.Types.ObjectId,
    idPractica: Schema.Types.ObjectId
});
schema.plugin(AuditPlugin);

export let ConfiguracionDerivacion = model('configuracionDerivacion', schema, 'configuracionDerivacion');
