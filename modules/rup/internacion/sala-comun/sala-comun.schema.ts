import { SchemaTypes, Schema, model } from 'mongoose';
import { AuditPlugin, AndesDocWithAudit } from '@andes/mongoose-plugin-audit';
import { SnomedConcept } from '../../schemas/snomed-concept';
import * as nombreSchema from '../../../../core/tm/schemas/nombre';
import { OrganizacionRef, UnidadOrganizativa } from '../../../../core/tm/interfaces/IOrganizacion';
import { ISectores } from '../../../../core/tm/interfaces/ISectores';
import { ObjectId } from '@andes/core';
import * as moment from 'moment';

export type SalaComunID = ObjectId;

export interface ISalaComun {
    id: SalaComunID;
    nombre: string;
    organizacion: OrganizacionRef;
    capacidad?: number;
    ambito: string;
    unidadOrganizativas: UnidadOrganizativa[];
    sectores: ISectores[];
    estado: string;
    lastSync?: Date;
}
export type SalaComunDocument = AndesDocWithAudit<ISalaComun>;

export type SalaComunOcupacionItem = {
    paciente: any,
    ambito: String,
    idInternacion: ObjectId,
    desde: Date,
    createdBy: any;
    createdAt: Date;
    updatedBy: any;
    updatedAt: Date;
};

export type ISalaComunSnapshot = ISalaComun & {
    idSalaComun: ObjectId;
    fecha: Date;
    ocupacion: SalaComunOcupacionItem[];
};
export type SalaComunSnapshotDocument = AndesDocWithAudit<ISalaComunSnapshot>;


const SalaComunBaseSchema = new Schema({
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
    lastSync: { type: Date, select: false }
});

const SalaComunSchema = SalaComunBaseSchema.clone();

SalaComunSchema.plugin(AuditPlugin);
SalaComunSchema.pre('save', async function (this: SalaComunDocument) {
    const sala = this;
    if (!sala.isNew) {
        return;
    }
    sala.lastSync = moment().startOf('year').toDate();

    const { id, nombre, organizacion, capacidad, ambito, estado, sectores, unidadOrganizativas } = sala;
    const snapshot = new SalaComunSnapshot({
        idSalaComun: id,
        fecha: moment().startOf('year').toDate(),
        ocupacion: [],
        nombre,
        organizacion,
        capacidad,
        ambito,
        estado,
        sectores,
        unidadOrganizativas
    });
    (snapshot as any).$audit = (sala as any).$audit;
    await snapshot.save();
});

const SalaComunSnapshotSchema = SalaComunBaseSchema.clone();
SalaComunSnapshotSchema.add({
    idSalaComun: SchemaTypes.ObjectId,
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
        unidadOrganizativas: [SnomedConcept],

        createdAt: { type: Date, required: false },
        createdBy: { type: SchemaTypes.Mixed, required: false },
        updatedAt: { type: Date, required: false },
        updatedBy: { type: SchemaTypes.Mixed, required: false },
    }]
});
SalaComunSnapshotSchema.index({ idSalaComun: 1, fecha: 1 });

export const SalaComun = model<SalaComunDocument>('internacionSalaComun', SalaComunSchema, 'internacionSalaComun');
export const SalaComunSnapshot = model<SalaComunSnapshotDocument>('internacionSalaComunSnapshot', SalaComunSnapshotSchema, 'internacionSalaComunSnapshot');
