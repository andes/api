import * as mongoose from 'mongoose';

export interface FormTypes {
    name: string;
    type: string;
    snomedCode: string;
    active: boolean;
    sections: {
        id: string,
        active: boolean,
        name: string,
        type: string,
        fields: {
            key: string;
            label: string;
            type: string;
            description: string;
            required: boolean;
            snomedCodeOrQuery: string,
            subfilter: {
                type: boolean;
                default: false;
            };
            extras: any;
            resources: string;
            preload: boolean;
        }[];
    }[];
}
export interface FormsTypesDocument extends mongoose.Document, FormTypes { }

export const FieldSchema = new mongoose.Schema({
    key: {
        type: String,
        trim: true,
        lowercase: true
    },
    label: String,
    description: String,
    type: String,
    min: Number,
    max: Number,
    snomedCodeOrQuery: String,
    required: Boolean,
    subfilter: Boolean,
    resources: { type: String, required: false },
    preload: Boolean,

});

export const SectionSchema = new mongoose.Schema({
    id: String,
    active: Boolean,
    name: String,
    type: String,
    fields: [FieldSchema]
});

export const FormSchema = new mongoose.Schema({
    name: { type: String, index: { unique: true } },
    active: { type: Boolean, default: true },
    snomedCode: { type: String },
    type: { type: String, index: { unique: true } },
    sections: [SectionSchema]
});

FormSchema.index({
    name: 1,
    type: 1
});

FormSchema.index({
    'sections.fields.key': 1
});

export const Forms = mongoose.model<FormsTypesDocument>('forms', FormSchema, 'forms');
