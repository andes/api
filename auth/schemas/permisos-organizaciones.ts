import { Schema, model, Types } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';


export const PermisosOrganizacionesSchema = new Schema({
    _id: Types.ObjectId,
    nombre: String,
    permisos: [String],
    activo: Boolean,
    perfiles: [{
        _id: Types.ObjectId,
        nombre: String
    }]
});
PermisosOrganizacionesSchema.plugin(AuditPlugin);

