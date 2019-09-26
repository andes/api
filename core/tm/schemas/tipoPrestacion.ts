import { Document, Schema, Model, model } from 'mongoose';

export interface ITipoPrestacion extends Document {
    nombre?: String;
    conceptId: String;
    term: String;
    fsn: String;
    semanticTag: 'procedimiento' | 'solicitud' | 'hallazgo' | 'trastorno' | 'antecedenteFamiliar' | 'régimen/tratamiento';
}


export let tipoPrestacionSchema = new Schema({
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: {
        type: String,
        enum: ['procedimiento', 'solicitud', 'hallazgo', 'trastorno', 'antecedenteFamiliar', 'régimen/tratamiento']
    },
    noNominalizada: Boolean,
    auditable: {
        type: Boolean,
        required: false,
        default: true
    }
});

/* Se definen los campos virtuals */
tipoPrestacionSchema.virtual('nombre').get(function () {
    return this.term;
});

export let tipoPrestacion: Model<ITipoPrestacion> = model('tipoPrestacion', tipoPrestacionSchema, 'conceptoTurneable');

