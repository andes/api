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
        idEspecialidad: Number, // id Interno de SIPS
        nombreEspecialidad: String, // nombre de la especialidad en SIPS
        codigo : Number // Codigo de la prestación (va a servir para vincular las prestaciones que tengan distinto ID)
    }]
});

export let configuracionPrestacionModel = mongoose.model('configuracionPrestacion', configuracionPrestacionSchema, 'configuracionPrestacion');
