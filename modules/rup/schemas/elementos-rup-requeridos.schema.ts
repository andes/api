import * as mongoose from 'mongoose';
import { ISnomedConcept, SnomedConcept } from './snomed-concept';
import { AndesDoc, AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ObjectId } from '@andes/core';

export interface IElementoRUP {
    nombre: string;
    descripcion: string;
    active: boolean;
    concepto: ISnomedConcept;
    contexto: any[];
    rules: any;
    target: any[];
}

export type IElementoRUPDoc = AndesDoc<IElementoRUP>;

export const ElementoRUPRequeridosSchema = new mongoose.Schema({
    // Nombre de fantasía
    nombre: String,
    descripcion: String,
    active: {
        type: Boolean,
        required: true
    },
    // Indica si este elementoRUP aplica a una solicitud
    esSolicitud: {
        type: Boolean,
        required: false,
        default: false
    },
    concepto: SnomedConcept,
    contexto: [mongoose.SchemaTypes.Mixed],
    rules: mongoose.SchemaTypes.Mixed,
    target: [{
        concepto: SnomedConcept,
        tipo: String
    }]

});


export const ElementoRUPRequeridos = mongoose.model<IElementoRUPDoc>('elementos-rup-requeridos', ElementoRUPRequeridosSchema, 'elementos-rup-requeridos');

