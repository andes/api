import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Document, Model, model, Schema, SchemaTypes, Types } from 'mongoose';

export const UsuarioIngresoSchema = new Schema({
    usuario: {
        id: { type: SchemaTypes.ObjectId, required: true },
        usuario: { type: String, required: true }
    },
    start: { type: Date, required: true },
    cantidad: { type: Number, default: 0 },
    bucketNumber: { type: Number, default: 0 },
    ingresos: [{
        fecha: { type: Date, required: true },
        organizacion: {
            id: { type: SchemaTypes.ObjectId, required: true },
            nombre: { type: String, required: true }
        },
        device: {
            ip: String,
            tipo: String,
            os: String
        }
    }]
});

export interface IUsuarioIngresos extends Document {
    usuario: {
        id: Types.ObjectId;
        usuario: string;
    };
    start: Date;
    cantidad: number;
    bucketNumber: number;
    ingresos: [{
        fecha: Date;
        organizacion: {
            id: Types.ObjectId;
            nombre: string;
        };
        device: {
            ip: string;
            tipo: string;
            os: string;
        };
    }];
}

UsuarioIngresoSchema.index({ 'usuario.id': 1, start: -1, bucketNumber: 1 }, { unique: true });
UsuarioIngresoSchema.plugin(AuditPlugin);

export const UsuarioIngreso: Model<IUsuarioIngresos> = model<IUsuarioIngresos>('usuarioIngreso', UsuarioIngresoSchema, 'usuarioIngresos');
