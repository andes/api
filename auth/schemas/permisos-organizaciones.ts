import { Schema, Types, SchemaTypes } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';


export const PermisosOrganizacionesSchema = new Schema({
    _id: Types.ObjectId,
    nombre: String,
    permisos: [String],
    activo: Boolean,
    perfiles: [{
        _id: Types.ObjectId,
        nombre: String
    }],
    lastLogin: Date,
    fechaVencimiento: Date,
    createdAt: { type: Date, required: false },
    createdBy: { type: SchemaTypes.Mixed, required: false },
    updatedAt: { type: Date, required: false },
    updatedBy: { type: SchemaTypes.Mixed, required: false }
});
PermisosOrganizacionesSchema.plugin(AuditPlugin);

