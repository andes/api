import { Document, Schema, Model, model } from 'mongoose';

export interface ITipoPrestacion extends Document {
    nombre?: string;
    conceptId: string;
    term: string;
    fsn: string;
    semanticTag: 'procedimiento' | 'solicitud' | 'hallazgo' | 'trastorno' | 'antecedenteFamiliar' | 'régimen/tratamiento';
    codigoServSalud?: string;
}


export let tipoPrestacionSchema = new Schema({
    conceptId: String,
    term: String,
    fsn: String,
    semanticTag: String,
    noNominalizada: Boolean,
    auditable: {
        type: Boolean,
        required: false,
        default: true
    },
    codigoServSalud: {
        type: String,
    }
});

/* Se definen los campos virtuals */
tipoPrestacionSchema.virtual('nombre').get(function () {
    return this.term;
});

export let tipoPrestacion: Model<ITipoPrestacion> = model('tipoPrestacion', tipoPrestacionSchema, 'conceptoTurneable');

