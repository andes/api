import * as mongoose from 'mongoose';

export const nomivacDosisSchema = new mongoose.Schema({
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
    esquema: {
        _id: mongoose.Schema.Types.ObjectId,
        codigo: Number,
        nombre: String
    },
    limiteMinimoReal: Number,
    limiteMaximoReal: Number,
    limiteMinimoIdeal: Number,
    limiteMaximoIdeal: Number,
    tiempoDeCobertura: Number,
    tiempoInterdosis: Number,
    sePuedeRepetir: String,
    anual: String,
    refuerzo: String,
    habilitado: Boolean
});

nomivacDosisSchema.index({
    'vacuna._id': 1,
    'esquema._id': 1
});
export const nomivacDosis = mongoose.model('nomivacDosis', nomivacDosisSchema, 'nomivacDosis');
