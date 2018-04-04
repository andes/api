import * as mongoose from 'mongoose';

export let CDAPrestacionesSchema = new mongoose.Schema({
    conceptId: String,
    fsn: String,
    term: String,
    semanticTag: String,
    loinc: {
        code: String,
        codeSystem: String,
        codeSystemName: String,
        displayName: String
    }

}, { timestamps: true });

export let CDAPrestacionesModel = mongoose.model('CDAPrestaciones', CDAPrestacionesSchema);
