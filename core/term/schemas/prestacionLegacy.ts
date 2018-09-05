import * as mongoose from 'mongoose';

export let prestacionLegacySchema = new mongoose.Schema({
    idEspecialidad: Number,
    nombreEspecialidad: String,
    codigo: Number
});

prestacionLegacySchema.virtual('nombre').get(function () {
    return this.nombreEspecialidad;
});

export let prestacionLegacy = mongoose.model('prestacionLegacy', prestacionLegacySchema, 'prestacionLegacy');
