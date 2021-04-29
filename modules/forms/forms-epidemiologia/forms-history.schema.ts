import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { FormsEpidemiologiaSchema } from './forms-epidemiologia-schema';


export const FormsHistorySchema = new mongoose.Schema({
    ficha: FormsEpidemiologiaSchema
});

FormsHistorySchema.plugin(AuditPlugin);

export const FormsHistory = mongoose.model('formsEpidemiologiaHistory', FormsHistorySchema, 'formsEpidemiologiaHistory');
