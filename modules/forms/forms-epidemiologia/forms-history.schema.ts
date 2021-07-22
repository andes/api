import * as mongoose from 'mongoose';
import { FormsEpidemiologiaCloneSchema } from './forms-epidemiologia-schema';


let FormsHistorySchema = FormsEpidemiologiaCloneSchema.clone();
FormsHistorySchema.add({
    createdAt: Date,
    createdBy: { nombreCompleto: String, username: String },
    updatedAt: Date,
    updatedBy: { nombreCompleto: String, username: String },
    id: mongoose.Types.ObjectId
});

export const FormsHistory = mongoose.model('formsEpidemiologiaHistory', FormsHistorySchema, 'formsEpidemiologiaHistory');
