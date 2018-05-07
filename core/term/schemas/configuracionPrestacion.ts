import * as mongoose from 'mongoose';

let configuracionPrestacionSchema = new mongoose.Schema({

    snomed: {
        conceptId: String,
        fsn: String,
        term: String,
        semanticTag: String
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
        idEspecialidad: Number,
        nombreEspecialidad: String,
        codigo: Number
    }],
    nomencladores: [
        {
            sumar: String,
            recuperoFinanciero: String
        }
    ]
});

export let ConfiguracionPrestacion = mongoose.model('configuracionPrestacion', configuracionPrestacionSchema, 'configuracionPrestacion');
