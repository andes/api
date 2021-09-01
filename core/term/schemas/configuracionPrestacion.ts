import * as mongoose from 'mongoose';

export const configuracionPrestacionSchema = new mongoose.Schema({
    snomed: {
        conceptId: String,
        term: String,
        fsn: String,
        semanticTag: String,
    },
    loinc: {
        code: String,
        codeSystem: String,
        codeSystemName: String,
        displayName: String
    },
    idServicio: Number,
    organizaciones: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'organizacion'
        },
        codigo: Number, // Codigo de la prestación (va a servir para vincular las prestaciones que tengan distinto ID)
    }]
});

export const configuracionPrestacionModel = mongoose.model('configuracionPrestacion', configuracionPrestacionSchema, 'configuracionPrestacion');
