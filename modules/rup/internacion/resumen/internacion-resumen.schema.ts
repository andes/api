import { ObjectId } from '@andes/core';
import { AndesDoc } from '@andes/mongoose-plugin-audit';
import { Prestacion } from 'modules/rup/schemas/prestacion';
import { model, Schema, SchemaTypes, Types } from 'mongoose';
import { NombreSchemaV2 } from '../../../../shared/schemas';
import { ISnomedConcept, SnomedConcept } from '../../schemas/snomed-concept';
import { PacienteSubSchema } from '../../../../core-v2/mpi/paciente/paciente.schema';

export interface IInternacionResumen {
    ambito: String;
    paciente: {
        id: ObjectId;
        documento: String;
        numeroIdentificacion?: String;
        sexo: String;
        genero: String;
        nombre: String;
        alias?: String;
        apellido: String;
        fechaNacimiento: String;
    };
    organizacion: {
        id: ObjectId;
        nombre: String;
    };
    fechaIngreso?: Date;
    fechaEgreso?: Date;
    fechaAtencion?: Date;
    tipo_egreso?: String;
    deletedAt?: Date;
    idPrestacion: ObjectId;
    ingreso: {
        elementoRUP?: ObjectId;
        registros?: [any];
    };
    prioridad?: {
        id: number;
        label: String;
        type: String;
    };
    registros: [{
        tipo?: String;
        idPrestacion?: Types.ObjectId;
        concepto: ISnomedConcept;
        valor: Object;
        esDiagnosticoPrincipal?: boolean;
    }];
}

export type IInternacionResumenDoc = AndesDoc<IInternacionResumen>;

export const InternacionResumenSchema = new Schema({
    ambito: String,
    paciente: PacienteSubSchema,
    organizacion: {
        type: NombreSchemaV2,
        required: true
    },
    fechaIngreso: Date,
    fechaEgreso: Date,
    fechaAtencion: Date,
    tipo_egreso: { type: String, required: false },
    deletedAt: { type: Date, required: false },
    deletedBy: { type: SchemaTypes.Mixed, required: false },
    idPrestacion: { type: SchemaTypes.ObjectId, ref: 'prestacion' },
    prioridad: new Schema({
        id: Number,
        label: String,
        type: String
    }, { _id: false }),

    ingreso: {
        type: {
            elementoRUP: SchemaTypes.ObjectId,
            registros: [SchemaTypes.Mixed]
        },
        required: false,
    },
    registros: [{
        tipo: String,
        idPrestacion: SchemaTypes.ObjectId,
        concepto: SnomedConcept,
        valor: SchemaTypes.Mixed,
        esDiagnosticoPrincipal: Boolean
    }]

});

InternacionResumenSchema.index({
    fechaIngreso: 1
});

export const InternacionResumen = model<IInternacionResumenDoc>('internacionPacienteResumen', InternacionResumenSchema, 'internacionPacienteResumen');
