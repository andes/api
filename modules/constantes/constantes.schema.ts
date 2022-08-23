import * as mongoose from 'mongoose';

export const ConstantesSchema = new mongoose.Schema({
    key: String,
    nombre: String,
    source: String,
    type: {
        type: String,
        enum: ['text', 'number']
    }
});

export const Constantes = mongoose.model('constantes', ConstantesSchema, 'constantes');
