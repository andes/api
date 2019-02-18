import { model, Schema  } from 'mongoose';

export let schema = new Schema({
    laboratorioDestino: Schema.Types.ObjectId,
    idPractica: Schema.Types.ObjectId
});
schema.plugin(require('../../../../mongoose/audit'));

export let ConfiguracionDerivacion = model('configuracionDerivacion', schema, 'configuracionDerivacion');
