import { model, Schema } from 'mongoose';
import * as Registro from './../../../../modules/rup/schemas/prestacion.registro';

export let Mischema = new Schema({
    laboratorioOrigen: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true },
    laboratorioDestino: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true },
    prestaciones: [{
        idPrestacion: String,
        numeroProtocolo: String,
        registro: Registro
    }]
});
Mischema.plugin(require('../../../../mongoose/audit'));

export let LoteDerivacion = model('loteDerivacion', Mischema, 'loteDerivacion');
