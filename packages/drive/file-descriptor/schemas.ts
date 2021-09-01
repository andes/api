import { Types, Model, model, Document, Schema } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export interface IFileDescriptor {
    adapter?: string;
    real_id?: string;
    mimetype: string;
    originalname: string;
    extension: string;
    origin?: string;
}

export interface FileDescriptorDocument extends Document, IFileDescriptor { }

export const FileDescriptorSchema: Schema = new Schema({
    adapter: String,
    real_id: String,
    mimetype: String,
    extension: String,
    originalname: String,
    origin: String
});

FileDescriptorSchema.plugin(AuditPlugin);
export const FileDescriptorModel: Model<FileDescriptorDocument> = model('AndesDriveMetadata', FileDescriptorSchema, 'AndesDriveMetadata');
