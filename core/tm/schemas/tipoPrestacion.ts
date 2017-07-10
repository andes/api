import * as mongoose from 'mongoose';

export let tipoPrestacionSchema = new mongoose.Schema({
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: {
        type: String,
        enum: ['procedimiento', 'solicitud', 'hallazgo', 'trastorno', 'antecedenteFamiliar']
    }
});

/* Se definen los campos virtuals */
tipoPrestacionSchema.virtual('nombre').get(function () {
    return this.term;
});

export let tipoPrestacion = mongoose.model('tipoPrestacion', tipoPrestacionSchema, 'conceptoTurneable');

