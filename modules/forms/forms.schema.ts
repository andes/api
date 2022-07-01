import * as mongoose from 'mongoose';

export interface FormTypes {
    name: string;
    type: string;
    snomedCode: string;
    config?: {
        idEvento: string;
        idGrupoEvento: string;
        configField: {
            key: string;
            value: string;
            event: string;
        }[];
    };
    active: boolean;
    sections: {
        id: string;
        active: boolean;
        name: string;
        type: string;
        preset: string;
        fields: {
            key: string;
            label: string;
            type: string;
            description: string;
            required: boolean;
            snomedCodeOrQuery: string;
            subfilter: {
                type: boolean;
                default: false;
            };
            items?: [{
                id: string;
                nombre: string;
            }];
            extras: any;
            resources: string;
            preload: boolean;
            dependency?: object;
            multiple?: boolean;
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
    extras: Object,
    items: { type: Array, required: false },
    resources: { type: String, required: false },
    preload: Boolean,
    dependency: Object,
    multiple: Boolean
});

export const SectionSchema = new mongoose.Schema({
    id: String,
    active: Boolean,
    name: String,
    type: String,
    preset: String,
    fields: [FieldSchema]
});

export const FormConfigSchema = new mongoose.Schema({
    idEvento: String,
    idGrupoEvento: String,
    configField: Array
});

export const FormSchema = new mongoose.Schema({
    name: { type: String, index: { unique: true } },
    active: { type: Boolean, default: true },
    config: FormConfigSchema,
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
