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
        apellidp: String,
        documento: Number
    },
    frecuentes: [{
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
