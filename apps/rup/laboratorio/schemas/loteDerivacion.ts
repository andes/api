import { model, Schema } from 'mongoose';
import * as Registro from './../../../../modules/rup/schemas/prestacion.registro';

export let schema = new Schema({
    numero: { type: String, required: true },
    fecha: { type: Date, required: true },
    laboratorioOrigen:
    {
        nombre: { type: String, required: true },
        id: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true }
    },
    laboratorioDestino: {
        nombre: { type: String, required: true },
        id: { type: Schema.Types.ObjectId, ref: 'organizacion', required: true }
    },
    estados: [{
        tipo: {
            type: String,
            enum: ['preparado', 'en transporte', 'recibido']
        }
    }],
    registrosPracticas: [{
        idPrestacion: String,
        numeroProtocolo: String,
        paciente: {
            id: { type: Schema.Types.ObjectId, ref: 'paciente', required: true },
            documento: String,
            apellido: String,
            nombre: String
        },
        registro: Registro
    }],
    usuarioResponsablePreparacion: String,
    usuarioEntrega: String
});
schema.plugin(require('../../../../mongoose/audit'));

export let LoteDerivacion = model('loteDerivacion', schema, 'loteDerivacion');
