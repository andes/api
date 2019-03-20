import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { model, Schema } from 'mongoose';

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
    itemsLoteDerivacion: [{
        idPrestacion: String,
        numeroProtocolo: String,
        fechaSolicitud: Date,
        paciente: {
            id: { type: Schema.Types.ObjectId, ref: 'paciente', required: true },
            documento: String,
            apellido: String,
            nombre: String,
            sexo: String
        },
        registros: [mongoose.Schema.Types.Mixed]
    }],
    usuarioResponsablePreparacion: String,
    usuarioEntrega: String
});
schema.plugin(AuditPlugin);

export let LoteDerivacion = model('loteDerivacion', schema, 'loteDerivacion');
