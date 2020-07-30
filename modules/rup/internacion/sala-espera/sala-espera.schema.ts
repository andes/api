import { SchemaTypes, Schema, model, Document, Types } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { SnomedConcept } from '../../schemas/snomed-concept';
import * as nombreSchema from '../../../../core/tm/schemas/nombre';
import { OrganizacionRef, UnidadOrganizativa } from '../../../../core/tm/interfaces/IOrganizacion';
import { ISectores } from '../../../../core/tm/interfaces/ISectores';
import { ObjectId } from '@andes/core';

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
    ocupacion: {
        paciente: any,
        ambito: String,
        idInternacion: ObjectId,
        desde: Date,
        createdBy: any;
        createdAt: Date;
        updatedBy: any;
        updatedAt: Date;
    }[];
}

export type SalaEsperaDocument = ISalaEspera & Document & {
    audit(user: any);
    createdBy: any;
    createdAt: Date;
    updatedBy: any;
    updatedAt: Date;
};


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
    unidadOrganizativas: [{
        SnomedConcept,
    }],
    sectores: [{
        tipoSector: SnomedConcept,
        unidadConcept: {
            type: SnomedConcept,
            required: false
        },
        nombre: String
    }],
    estado: String,
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
        // unidadOrganizativa (?)

        createdAt: { type: Date, required: false },
        createdBy: { type: SchemaTypes.Mixed, required: false },
        updatedAt: { type: Date, required: false },
        updatedBy: { type: SchemaTypes.Mixed, required: false },
    }]
});

SalaEsperaSchema.plugin(AuditPlugin);

export const SalaEspera = model<SalaEsperaDocument>('internacionSalaEspera', SalaEsperaSchema, 'internacionSalaEspera');
