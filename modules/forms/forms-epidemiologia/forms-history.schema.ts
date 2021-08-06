import * as mongoose from 'mongoose';
import { FormsEpidemiologiaCloneSchema } from './forms-epidemiologia-schema';

const FormsHistorySchema = FormsEpidemiologiaCloneSchema.clone();
FormsHistorySchema.add({
    createdAt: Date,
    createdBy: mongoose.Schema.Types.Mixed,
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.Mixed,
    id: mongoose.Types.ObjectId
});

export const FormsHistory = mongoose.model('formsEpidemiologiaHistory', FormsHistorySchema, 'formsEpidemiologiaHistory');
