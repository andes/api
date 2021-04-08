import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';

export const FormsEpidemiologiaSchema = new mongoose.Schema({
    type: {
        id: mongoose.Schema.Types.ObjectId,
        name: String
    },
    paciente: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'paciente' },
        documento: String,
        nombre: String,
        apellido: String,
        fechaNacimiento: Date,
    },
    secciones: [Object]
});

FormsEpidemiologiaSchema.plugin(AuditPlugin);

export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
