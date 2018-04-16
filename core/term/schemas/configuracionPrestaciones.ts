import * as mongoose from 'mongoose';

export let configuracionPrestacionSchema = new mongoose.Schema({
    tipoPrestacion: {
        id: mongoose.Schema.Types.ObjectId,
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
    organizacionesSips: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'organizacion'
        },
        idEspecialidad: Number
    }]
});

export let configuracionPrestacionModel = mongoose.model('configuracionPrestacion', configuracionPrestacionSchema, 'configuracionPrestacion');