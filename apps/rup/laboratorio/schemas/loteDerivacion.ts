import { model, Schema } from 'mongoose';
import * as Registro from './../../../../modules/rup/schemas/prestacion.registro';

export let schema = new Schema({
    laboratorioOrigen: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true },
    laboratorioDestino: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true },
    prestaciones: [{
        idPrestacion: String,
        numeroProtocolo: String,
        registro: Registro
    }]
});
schema.plugin(require('../../../../mongoose/audit'));

export let LoteDerivacion = model('loteDerivacion', schema, 'loteDerivacion');
