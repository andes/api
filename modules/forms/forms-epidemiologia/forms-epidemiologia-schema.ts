import * as mongoose from 'mongoose';


export const FieldsEpidemiologiaSchema = new mongoose.Schema({
    key: String,
    value: String
});

export const FormsEpidemiologiaSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    type: String,
    createdAt: Date,
    updatedAt: Date,
    fields: [FieldsEpidemiologiaSchema]
});

export const FormsEpidemiologia = mongoose.model('formsEpidemiologia', FormsEpidemiologiaSchema, 'formsEpidemiologia');
