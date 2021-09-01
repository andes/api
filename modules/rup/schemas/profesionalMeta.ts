/**
 * Colección para datos complementarios de cada profesional
 *
 * 1. frecuentesProfesional.ts => Prestaciones más frecuentes del profesional
 * 2. ...
 *
 */

import * as mongoose from 'mongoose';
import { SnomedConcept, ISnomedConcept } from './snomed-concept';

export interface IProfesionalMeta extends mongoose.Document {
    profesional: {
        id: mongoose.Types.ObjectId;
        nombre: string;
        apellido: string;
        documento: Number;
    };
    organizacion: {
        id: mongoose.Types.ObjectId;
        nombre: String;
    };
    tipoPrestacion: ISnomedConcept;
    frecuentes: [{
        // tipo de prestacion desde la cual se solicita
        concepto: ISnomedConcept;
        esSolicitud: Boolean;
        frecuencia: number;
        lastUse: Date;
    }];
}

export const ProfesionalMetaSchema = new mongoose.Schema({
    profesional: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String,
        apellido: String,
        documento: Number
    },
    // Organizacion desde la que se solicita la prestacion
    organizacion: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    tipoPrestacion: SnomedConcept,
    frecuentes: [{
        // tipo de prestacion desde la cual se solicita
        concepto: SnomedConcept,
        esSolicitud: Boolean,
        frecuencia: Number,
        lastUse: Date
    }]
});

export const ProfesionalMeta: mongoose.Model<IProfesionalMeta> = mongoose.model<IProfesionalMeta>('profesionalMeta', ProfesionalMetaSchema, 'profesionalMeta');
