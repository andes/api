import { Types, Model, model, Document, Schema } from 'mongoose';

export interface IFileDescriptor {
    adapter?: string;
    real_id?: string;
    mimetype: string;
    originalname: string;
    extension: string;
}

export interface FileDescriptorDocument extends Document, IFileDescriptor {}

export let FileDescriptorSchema: Schema = new Schema({
    adapter: String,
    real_id: String,
    mimetype: String,
    extension: String,
    originalname: String
});

export let FileDescriptorModel: Model<FileDescriptorDocument> = model('AndesDriveMetadata', FileDescriptorSchema, 'AndesDriveMetadata');
