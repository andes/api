import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { FormsEpidemiologiaCloneSchema } from './forms-epidemiologia-schema';


export const FormsHistorySchema = new mongoose.Schema({
    ficha: FormsEpidemiologiaCloneSchema
});

FormsHistorySchema.plugin(AuditPlugin);

export const FormsHistory = mongoose.model('formsEpidemiologiaHistory', FormsHistorySchema, 'formsEpidemiologiaHistory');
