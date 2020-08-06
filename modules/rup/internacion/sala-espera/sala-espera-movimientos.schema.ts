import { SchemaTypes, Schema, model, Types, Document } from 'mongoose';
import * as nombreSchema from '../../../../core/tm/schemas/nombre';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export interface ISalaEsperaMovimiento {
    idSalaEspera: Types.ObjectId;
    ambito: String;
    paciente: any;
    tipo: 'entra' | 'sale';
    idInternacion: Types.ObjectId;
    fecha: Date;

}

export type SalaEsperaMovimientoDocument = ISalaEsperaMovimiento & Document & {
    audit(user: any);
    createdBy: any;
    createdAt: Date;
    updatedBy: any;
    updatedAt: Date;
};

const SalaEsperaMovimientosSchema = new Schema({
    idSalaEspera: SchemaTypes.ObjectId,
    organizacion: {
        type: nombreSchema,
        required: true
    },
    ambito: String,
    paciente: {
        id: SchemaTypes.ObjectId,
        documento: String,
        sexo: String,
        genero: String,
        nombre: String,
        apellido: String,
        fechaNacimiento: Date
    },
    tipo: { type: String, enum: ['entra', 'sale'], required: true },
    idInternacion: SchemaTypes.ObjectId, // TrackID del proceso
    fecha: Date
});

SalaEsperaMovimientosSchema.plugin(AuditPlugin);
SalaEsperaMovimientosSchema.index({ idSalaEspera: 1, fecha: 1 });

export const SalaEsperaMovimientos = model<SalaEsperaMovimientoDocument>('internacionSalaEsperaMovimientos', SalaEsperaMovimientosSchema, 'internacionSalaEsperaMovimientos');


/**

InternacionResumen {
    id
    ingreso,
    egreso
    motivo_
    ambito
    lugar_actual
    movimientos,
    triage_adminitrativo,
    judizializado,
    otros
}


 */
