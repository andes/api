import { SnomedConcept } from './../../../modules/rup/schemas/snomed-concept';
import * as mongoose from 'mongoose';

export let tipoPrestacionSchema = new mongoose.Schema({
    type: SnomedConcept
});

/* Se definen los campos virtuals */
tipoPrestacionSchema.virtual('nombre').get(function () {
    return this.term;
});


export let tipoPrestacion = mongoose.model('tipoPrestacion', tipoPrestacionSchema, 'conceptoTurneable');

