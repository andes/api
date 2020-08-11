import { SchemaTypes, Schema, model, Types, Document } from 'mongoose';
import * as nombreSchema from '../../../../core/tm/schemas/nombre';
import { AuditPlugin, AndesDocWithAudit } from '@andes/mongoose-plugin-audit';

export enum SalaComunAccion {
    IN = 'IN',
    OUT = 'OUT'
}

export interface ISalaComunMovimiento {
    idSalaComun: Types.ObjectId;
    ambito: String;
    paciente: any;
    accion: SalaComunAccion;
    idInternacion: Types.ObjectId;
    fecha: Date;

}

export type SalaComunMovimientoDocument = AndesDocWithAudit<ISalaComunMovimiento>;

const SalaComunMovimientosSchema = new Schema({
    idSalaComun: SchemaTypes.ObjectId,
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

SalaComunMovimientosSchema.plugin(AuditPlugin);
SalaComunMovimientosSchema.index({ idSalaComun: 1, fecha: 1 });
SalaComunMovimientosSchema.index({ paciente: 1, fecha: 1 });

export const SalaComunMovimientos = model<SalaComunMovimientoDocument>('internacionSalaComunMovimientos', SalaComunMovimientosSchema, 'internacionSalaComunMovimientos');


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
