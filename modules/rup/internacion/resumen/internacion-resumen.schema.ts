import { ObjectId } from '@andes/core';
import { model, Schema, SchemaTypes } from 'mongoose';
import { AndesDoc } from '@andes/mongoose-plugin-audit';
import { NombreSchemaV2 } from '../../../../shared/schemas';


export interface IInternacionResumen {
    ambito: string;
    paciente: {
        id: ObjectId;
        documento: string;
        sexo: string;
        nombre: string;
        apellido: string;
        fechaNacimiento: string;
    };
    organizacion: {
        id: ObjectId;
        nombre: string;
    };
    fechaIngreso?: Date;
    fechaEgreso?: Date;
    fechaAtencion?: Date;
    tipo_egreso?: string;
    deletedAt?: Date;

    ingreso: {
        elementoRUP: ObjectId,
        registros: [any]
    };
    prioridad?: {
        id: number;
        label: string;
        type: string;
    };
}

export type IInternacionResumenDoc = AndesDoc<IInternacionResumen>;

export const InternacionResumenSchema = new Schema({
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
    organizacion: {
        type: NombreSchemaV2,
        required: true
    },
    fechaIngreso: Date,
    fechaEgreso: Date,
    fechaAtencion: Date,
    tipo_egreso: { type: String, required: false },
    deletedAt: { type: Date, required: false },

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
        required: false
    }

});

export const InternacionResumen = model<IInternacionResumenDoc>('internacionPacienteResumen', InternacionResumenSchema, 'internacionPacienteResumen');
