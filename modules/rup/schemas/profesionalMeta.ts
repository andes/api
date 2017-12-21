/**
 * Colección para datos complementarios de cada profesional
 *
 * 1. frecuentesProfesional.ts => Prestaciones más frecuentes del profesional
 * 2. ...
 *
 */

import * as mongoose from 'mongoose';
import { profesionalSchema } from './../../../core/tm/schemas/profesional';
import { SnomedConcept } from './snomed-concept';

export let schema = new mongoose.Schema({
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
        frecuencia: Number
    }]
});

// Autopopula todos los hijos
// schema.pre('find', (next) => {
//     this.populate('frecuentes');
//     next();
// });

export let profesionalMeta = mongoose.model('profesionalMeta', schema, 'profesionalMeta');
