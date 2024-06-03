import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Document, Model, model, Schema, SchemaTypes, Types } from 'mongoose';

export const HudsAccesoSchema = new Schema({
    paciente: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    start: Number,
    cantidadAccesos: Number,
    bucketNumber: String,
    accesos: [{
        fecha: Date,
        usuario: {
            id: SchemaTypes.ObjectId,
            nombreCompleto: String,
            nombre: String,
            apellido: String,
            username: String,
            documento: String
        },
        matricula: String,
        motivoAcceso: String,
        detalleMotivo: String,
        turno: SchemaTypes.ObjectId,
        prestacion: SchemaTypes.ObjectId,
        organizacion: SchemaTypes.Mixed,
        profesional: Schema.Types.Mixed,
        cliente: {
            ip: String,
            userAgent: { // schema de plugin https://github.com/biggora/express-useragent
                isMobile: Boolean,
                isDesktop: Boolean,
                isBot: Boolean,
                browser: String,
                version: String,
                os: String,
                platform: String,
                source: String
            }
        },
        servidor: {
            ip: String
        }
    }]
});

export interface IHudsAccesos extends Document {
    paciente: Types.ObjectId;
    start: number;
    cantidadAccesos: number;
    accesos: [{
        fecha: Date;
        usuario: any;
        matricula: string;
        motivoAcceso: string;
        detalleMotivo: string;
        turno: Types.ObjectId;
        prestacion: Types.ObjectId;
        organizacion: any;
        // profesional: Schema.Types.Mixed;
        cliente: any;

    }];
    cliente: {
        ip: String;
        userAgent: {
            isMobile: Boolean;
            isDesktop: Boolean;
            isBot: Boolean;
            browser: String;
            version: String;
            os: String;
            platform: String;
            source: String;
        };
    };
    servidor: {
        ip: String;
    };
}

HudsAccesoSchema.index({ paciente: 1, fecha: -1 });
HudsAccesoSchema.plugin(AuditPlugin);
export const HudsAcceso: Model<IHudsAccesos> = model<IHudsAccesos>('hudsAccesos', HudsAccesoSchema, 'hudsAccesos');
