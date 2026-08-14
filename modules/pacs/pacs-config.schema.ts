
import { model, Schema } from 'mongoose';
import { ISnomedConcept, SnomedConcept } from '../rup/schemas/snomed-concept';
import { NombreSchema } from '../../shared/schemas';
import { ObjectId } from '@andes/core';

export interface IPacsConfig {
    id: ObjectId;
    organizacion: {
        id: ObjectId;
        nombre: string;
    };
    tipoPrestacion: ISnomedConcept[];
    ui: string;
    modalidad: string;
    aet: string;
    host: string;
    visualizador_host: string;
    reconcileMatchingModalities?: string[];
    auth: {
        host: string;
        clientId: string;
        clientSecret: string;
    };
    featureFlags: {
        usoIdDNI: boolean;
        reconciliarEstudios?: boolean;
    };
}

export const PacsConfigSchema = new Schema({
    organizacion: NombreSchema,
    tipoPrestacion: [
        SnomedConcept
    ],
    ui: String,
    modalidad: String,
    aet: String,
    host: String,
    visualizador_host: String,
    reconcileMatchingModalities: [String],
    auth: {
        host: String,
        clientId: String,
        clientSecret: String,
    },
    featureFlags: {
        usoIdDNI: {
            type: Boolean,
            default: false
        },
        reconciliarEstudios: {
            type: Boolean,
            default: false
        }
    }
});

export const PacsConfig = model('pacs-config', PacsConfigSchema, 'pacs-config');
