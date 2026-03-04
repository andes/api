import { Document, Model, model, Schema, Types } from 'mongoose';

export interface ITipoPrestacion extends Document {
    nombre?: string;
    conceptId: string;
    term: string;
    fsn: string;
    semanticTag: 'procedimiento' | 'solicitud' | 'hallazgo' | 'trastorno' | 'antecedenteFamiliar' | 'régimen/tratamiento';
    codigoServSalud?: string;
    multiprestacion?: {
        nombre?: string;
        conceptId: string;
        term: string;
        fsn: string;
        semanticTag: String;
    }[];
    ambito: String[];
    queries: [Types.ObjectId];
    agendaDinamica?: Boolean;
    teleConsulta?: Boolean;
    tiempoVigencia?: number;
}

export const tipoPrestacionSchema = new Schema({
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
    },
    multiprestacion: {
        required: false,
        type: [{
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: String,
        }]
    },
    ambito: [String],
    agendaDinamica: {
        type: Boolean,
        required: false
    },
    queries: [Types.ObjectId],
    teleConsulta: {
        type: Boolean,
        required: false,
        default: false
    },
    tiempoVigencia: {
        type: Number,
        required: false
    }
});

/* Se definen los campos virtuals */
tipoPrestacionSchema.virtual('nombre').get(function () {
    return this.term;
});

export const tipoPrestacion: Model<ITipoPrestacion> = model('tipoPrestacion', tipoPrestacionSchema, 'conceptoTurneable');

