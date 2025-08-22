import * as mongoose from 'mongoose';

export interface RecetaParametros {
    key: string;
    nombre: string;
    value: string;
    type: 'text' | 'number';
    observacion: string;
}

export const RecetasParametrosSchema = new mongoose.Schema({
    key: String,
    nombre: String,
    value: String,
    type: {
        type: String,
        enum: ['text', 'number']
    },
    observacion: String
});


export const RecetasParametros = mongoose.model('recetasParametros', RecetasParametrosSchema, 'recetasParametros');
