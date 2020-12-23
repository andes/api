import * as mongoose from 'mongoose';

export const nomivacEsquemaSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigo: {
        type: Number,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    vacuna: {
        _id: mongoose.Schema.Types.ObjectId,
        codigo: Number,
        nombre: String,
        snomed_conceptId: String
    },
    condicion: {
        _id: mongoose.Schema.Types.ObjectId,
        codigo: Number,
        nombre: String
    },
    regular: String,
    embarazo: String,
    habilitado: Boolean
});

nomivacEsquemaSchema.index({
    'vacuna._id': 1,
    'condicion._id': 1
});
export let nomivacEsquema = mongoose.model('nomivacEsquemas', nomivacEsquemaSchema, 'nomivacEsquemas');
