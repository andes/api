import * as mongoose from 'mongoose';

export let prestacionesLegacySchema = new mongoose.Schema({
    idEspecialidad: Number,
    nombreEspecialidad: String,
    codigo: Number
});

export let prestacionesLegacy = mongoose.model('prestacionesLegacy', prestacionesLegacySchema, 'prestacionesLegacy');
