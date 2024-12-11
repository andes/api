import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { model, Schema } from 'mongoose';

export const FinanciadorSchema = new Schema({
    codigoPuco: Number,
    nombre: String,
    financiador: String,
    id: Schema.Types.ObjectId,
    numeroAfiliado: String,
    prepaga: Boolean,
    idObraSocial: Number,
    origen: String,
    fechaDeActualizacion: Date,
}, { _id: false });


FinanciadorSchema.plugin(AuditPlugin);

export const FinanciadorModel = model('financiadorModel', FinanciadorSchema);
