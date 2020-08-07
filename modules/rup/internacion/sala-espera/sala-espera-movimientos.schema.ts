import { SchemaTypes, Schema, model, Types, Document } from 'mongoose';
import * as nombreSchema from '../../../../core/tm/schemas/nombre';
import { AuditPlugin, AndesDocWithAudit } from '@andes/mongoose-plugin-audit';

export enum SalaEsperaAccion {
    IN = 'IN',
    OUT = 'OUT'
}

export interface ISalaEsperaMovimiento {
    idSalaEspera: Types.ObjectId;
    ambito: String;
    paciente: any;
    accion: SalaEsperaAccion;
    idInternacion: Types.ObjectId;
    fecha: Date;

}

export type SalaEsperaMovimientoDocument = AndesDocWithAudit<ISalaEsperaMovimiento>;

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
    accion: {
        type: String,
        enum: ['IN', 'OUT'],
        required: true
    },
    idInternacion: SchemaTypes.ObjectId, // TrackID del proceso
    fecha: Date
});

SalaEsperaMovimientosSchema.plugin(AuditPlugin);
SalaEsperaMovimientosSchema.index({ idSalaEspera: 1, fecha: 1 });
SalaEsperaMovimientosSchema.index({ paciente: 1, fecha: 1 });

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
