import { ObjectId } from '@andes/core';
import { IFinanciador } from '../../core-v2/mpi/financiador';
import { IOrganizacion } from '../../core/tm/interfaces/IOrganizacion';
import { ISnomedConcept } from './schemas/snomed-concept';
import { Document } from 'mongoose';

export interface IPrestacion {
    id: ObjectId;
    paciente?: {
        id: ObjectId;
        nombre: string;
        apellido: string;
        documento: string;
        telefono: string;
        sexo: string;
        fechaNacimiento: Date;
        obraSocial: IFinanciador
    };
    inicio: 'top' | 'agenda' | 'fuera-agenda' | 'internacion';
    noNominalizada: boolean;
    estadoFacturacion?: {
        tipo: String,
        numero: Number,
        estado: String
    };
    estadoActual: IPrestacionEstado;
    estados: IPrestacionEstado[];
    ejecucion: {
        organizacion: Pick<IOrganizacion, 'id' | 'nombre'>;
        fecha: Date;
        registros: IPrestacionRegistro[];
    };

    solicitud: IPrestacionSolicitud;

}

export interface IPrestacionEstado {
    tipo: 'anulada' | 'pendiente' | 'ejecucion' | 'auditoria' | 'aceptada' | 'rechazada' | 'validada' | 'desvinculada' | 'modificada' | 'asignada';
    idOrigenModifica?: string;
    motivoRechazo?: string;
    observaciones?: string;
    createdAt?: Date;
    createdBy?: any;
    updatedAt?: Date;
    updatedBy?: any;
}

export interface IPrestacionRegistro {
    nombre: string;
    concepto: ISnomedConcept;
    destacado?: boolean;
    esSolicitud: boolean;
    esDiagnosticoPrincipal: boolean;
    isEmpty: boolean;
    privacy?: {
        scope: 'private' | 'public' | 'termOnly'
    };
    esPrimeraVez: boolean;
    valor?: any;
    registros?: IPrestacionRegistro[];
    relacionadoCon: any[];
}

export interface IPrestacionSolicitud {
    fecha: Date;
    ambitoOrigen: 'ambulatorio' | 'internacion';
    tipoPrestacion: ISnomedConcept;
    tipoPrestacionOrigen?: ISnomedConcept;

    turno?: ObjectId;

    organizacion: Pick<IOrganizacion, 'id' | 'nombre'>;
    organizacionOrigen: Pick<IOrganizacion, 'id' | 'nombre'>;

    profesional: {
        id: ObjectId;
        nombre: string;
        apellido: string;
        documento: string;
    };

    profesionalOrigen?: {
        id: ObjectId;
        nombre: string;
        apellido: string;
        documento: string;
    };
    prestacionOrigen: ObjectId;

    historial: any[]; // [TODO]

    registros?: IPrestacionRegistro[];
}

export type IPrestacionDoc = IPrestacion & Document & {
    findRegistroById(id: ObjectId): IPrestacionRegistro[];
    getRegistros(): IPrestacionRegistro[];
};

export type IPrestacionRegistroDoc = IPrestacionRegistro & Document;
