import { model, Schema } from 'mongoose';
import { model as Prestacion } from '../../../../modules/rup/schemas/prestacion';

export let schema = new Schema({
    laboratorioOrigen: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true },
    laboratorioDestino: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true },
    prestaciones: [Prestacion]
});
schema.plugin(require('../../../../mongoose/audit'));

export let LoteDerivacion = model('loteDerivacion', schema, 'loteDerivacion');
