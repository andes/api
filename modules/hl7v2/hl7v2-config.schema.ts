
import { model, Schema } from 'mongoose';
import { ISnomedConcept, SnomedConcept } from '../rup/schemas/snomed-concept';
import { NombreSchema } from '../../shared/schemas';
import { ObjectId } from '@andes/core';

export interface IHL7v2Config {
    id: ObjectId;
    organizacion: {
        id: ObjectId;
        nombre: string;
    };
    elementoRUP: any;
    tipoPrestacion: ISnomedConcept[];
    hl7Destinations: {
        ipAddress: string;
        port: number;
    }[];
    tipoMensaje: string;
    queueName: string;
    msgQueue: any[];
    mapping: any;
};

export const HL7v2ConfigSchema = new Schema({
    organizacion: {
        type: NombreSchema,
        required: true,
    },
    elementoRUP: SnomedConcept,
    tipoPrestacion: [SnomedConcept],
    hl7Destinations: [
        {
            ipAddress: String,
            port: Number,
        },
    ],
    tipoMensaje: String,
    queueName: String,
    msgQueue: [Schema.Types.Mixed],
    mapping: Schema.Types.Mixed
});

export const HL7v2Config = model('hl7v2config', HL7v2ConfigSchema, 'hl7v2config');
