/**
 * Colección para datos complementarios de cada profesional
 *
 * 1. frecuentesProfesional.ts => Prestaciones más frecuentes del profesional
 * 2. ...
 *
 */

import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';

export let ProfesionalMetaSchema = new mongoose.Schema({
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
        frecuencia: Number
    }]
});

export let ProfesionalMeta = mongoose.model('profesionalMeta', ProfesionalMetaSchema, 'profesionalMeta');
