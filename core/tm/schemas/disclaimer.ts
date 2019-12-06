import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const DisclaimerSchema = new mongoose.Schema({
    version: String,
    texto: String,
    activo: Boolean
});
export const Disclaimer = mongoose.model('disclaimer', DisclaimerSchema, 'authDisclaimers');
