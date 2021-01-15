import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export interface FormTypes {
    name: string;
    type: string;
    active: boolean;
    fields: {
        key: string;
        label: string;
        type: string;
        description: string;
        required: boolean;
        subfilter: {
            type: boolean;
            default: false;
        };
        extras: any;
        resources: string;
        preload: boolean;
    }[];
}

export interface FormsTypesDocument extends mongoose.Document, FormTypes { }

export const FieldSchema = new mongoose.Schema({
    key: {
        type: String,
        trim: true,
        lowercase: true,
        index: { unique: true }
    },
    label: String,
    description: String,
    type: String,
    min: Number,
    max: Number,
    required: Boolean,
    subfilter: Boolean,
    resource: { type: String, required: false },
    preload: Boolean,

});

export const FormSchema = new mongoose.Schema({
    name: String,
    active: { type: Boolean, default: true },
    type: {
        type: String,
        index: { unique: true }
    },
    fields: [FieldSchema]
});

FormSchema.index({
    name: 1,
    type: 1
});

export const Forms = mongoose.model<FormsTypesDocument>('forms', FormSchema, 'forms');
