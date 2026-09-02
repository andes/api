import * as mongoose from 'mongoose';
import { Document, Model } from 'mongoose';

export interface Constante {
    key: string;
    nombre: string;
    source: string;
    type: 'text' | 'number';
}

export interface ConstanteDocument extends Constante, Document { }

export const ConstantesSchema = new mongoose.Schema({
    key: String,
    nombre: String,
    source: String,
    valor: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['text', 'number']
    }
});


export const Constantes: Model<ConstanteDocument> = mongoose.model(
    'constantes',
    ConstantesSchema,
    'constantes'
);
