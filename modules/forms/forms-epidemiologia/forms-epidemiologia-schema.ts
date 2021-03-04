import { PacienteSchema } from '../../../core-v2/mpi/paciente/paciente.schema';
import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';


export const FormsEpidemiologiaSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    type: String,
    createdAt: Date,
    updatedAt: Date,
    paciente: PacienteSchema,
    secciones: [Object]
});

FormsEpidemiologiaSchema.plugin(AuditPlugin);

export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
