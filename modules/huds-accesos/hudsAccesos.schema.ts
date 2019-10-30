import { Schema, SchemaTypes, Types, Model, model, Document } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const HudsAccesoSchema = new Schema({
    paciente: {
        type: SchemaTypes.ObjectId,
        required: true
    },
    anio: Number,
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
        turno: SchemaTypes.ObjectId,
        prestacion: Schema.Types.Mixed,
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
    anio: Number;
    cantidadAccesos: Number;
    accesos: [{
        fecha: Date;
        usuario: any;
        matricula: String;
        motivo: String;
        turno: Types.ObjectId;
        prestacion: Types.ObjectId;
        organizacion: any;
        profesional: Schema.Types.Mixed;

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
        }
    };
    servidor: {
        ip: String
    };
}

HudsAccesoSchema.index({ paciente: 1, fecha: -1 });
HudsAccesoSchema.plugin(AuditPlugin);
export const HudsAcceso: Model<IHudsAccesos> = model<IHudsAccesos>('hudsAccesos', HudsAccesoSchema, 'hudsAccesos');
