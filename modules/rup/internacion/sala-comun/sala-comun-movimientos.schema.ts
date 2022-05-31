import { AndesDocWithAudit, AuditPlugin } from '@andes/mongoose-plugin-audit';
import { model, Schema, SchemaTypes, Types } from 'mongoose';
import { UnidadOrganizativa } from '../../../../core/tm/interfaces/IOrganizacion';
import { NombreSchemaV2 } from '../../../../shared/schemas';
import { SnomedConcept } from '../../schemas/snomed-concept';
import { InternacionExtrasSchema } from '../cama-estados.schema';
import { PacienteSubSchema } from '../../../../core-v2/mpi/paciente/paciente.schema';

// eslint-disable-next-line no-shadow
export enum SalaComunAccion {
    IN = 'IN',
    OUT = 'OUT'
}

export interface ISalaComunMovimiento {
    idSalaComun: Types.ObjectId;
    ambito: String;
    paciente: any;
    accion: 'IN' | 'OUT';
    idInternacion: Types.ObjectId;
    fecha: Date;
    unidadOrganizativas: UnidadOrganizativa[];
}

export type SalaComunMovimientoDocument = AndesDocWithAudit<ISalaComunMovimiento>;

const SalaComunMovimientosSchema = new Schema({
    idSalaComun: SchemaTypes.ObjectId,
    organizacion: {
        type: NombreSchemaV2,
        required: true
    },
    ambito: String,
    paciente: PacienteSubSchema,
    accion: {
        type: String,
        enum: ['IN', 'OUT'],
        required: true
    },
    idInternacion: SchemaTypes.ObjectId, // TrackID del proceso
    fecha: Date,
    extras: { type: InternacionExtrasSchema, required: false },
    unidadOrganizativas: [SnomedConcept],
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
