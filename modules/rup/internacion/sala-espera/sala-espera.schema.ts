import { SchemaTypes, Schema, model, Document, Types } from 'mongoose';
import { AuditPlugin, AndesDocWithAudit } from '@andes/mongoose-plugin-audit';
import { SnomedConcept } from '../../schemas/snomed-concept';
import * as nombreSchema from '../../../../core/tm/schemas/nombre';
import { OrganizacionRef, UnidadOrganizativa } from '../../../../core/tm/interfaces/IOrganizacion';
import { ISectores } from '../../../../core/tm/interfaces/ISectores';
import { ObjectId } from '@andes/core';

/**
 * useful types generations
 */

export type SalaEsperaID = ObjectId;

export interface ISalaEspera {
    id: SalaEsperaID;
    nombre: string;
    organizacion: OrganizacionRef;
    capacidad?: number;
    ambito: string;
    unidadOrganizativas: UnidadOrganizativa[];
    sectores: ISectores[];
    estado: string;
}
export type SalaEsperaDocument = AndesDocWithAudit<ISalaEspera>;

export type SalaEsperaOcupacionItem = {
    paciente: any,
    ambito: String,
    idInternacion: ObjectId,
    desde: Date,
    createdBy: any;
    createdAt: Date;
    updatedBy: any;
    updatedAt: Date;
};

export type ISalaEsperaSnapshot = ISalaEspera & {
    idSalaEspera: ObjectId;
    fecha: Date;
    ocupacion: SalaEsperaOcupacionItem[];
};
export type SalaEsperaSnapshotDocument = AndesDocWithAudit<ISalaEsperaSnapshot>;


const SalaEsperaSchema = new Schema({
    nombre: {
        type: String,
        required: true
    },
    organizacion: {
        type: nombreSchema,
        required: true
    },
    capacidad: Number,
    ambito: String,
    unidadOrganizativas: [SnomedConcept],
    sectores: [{
        tipoSector: SnomedConcept,
        unidadConcept: {
            type: SnomedConcept,
            required: false
        },
        nombre: String
    }],
    estado: String,
});
SalaEsperaSchema.plugin(AuditPlugin);


const SalaEsperaSnapshotSchema = SalaEsperaSchema.clone();
SalaEsperaSnapshotSchema.add({
    idSalaEspera: SchemaTypes.ObjectId,
    fecha: Date,
    ocupacion: [{
        paciente: {
            id: SchemaTypes.ObjectId,
            documento: String,
            sexo: String,
            genero: String,
            nombre: String,
            apellido: String,
            fechaNacimiento: Date
        },
        ambito: String,
        idInternacion: SchemaTypes.ObjectId,
        desde: Date,
        unidadOrganizativa: [SnomedConcept],

        createdAt: { type: Date, required: false },
        createdBy: { type: SchemaTypes.Mixed, required: false },
        updatedAt: { type: Date, required: false },
        updatedBy: { type: SchemaTypes.Mixed, required: false },
    }]
});
SalaEsperaSnapshotSchema.index({ idSalaEspera: 1, fecha: 1 });

export const SalaEspera = model<SalaEsperaDocument>('internacionSalaEspera', SalaEsperaSchema, 'internacionSalaEspera');
export const SalaEsperaSnapshot = model<SalaEsperaSnapshotDocument>('internacionSalaEsperaSnapshot', SalaEsperaSnapshotSchema, 'internacionSalaEsperaSnapshot');
