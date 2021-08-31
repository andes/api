import * as mongoose from 'mongoose';

export const prestacionLegacySchema = new mongoose.Schema({
    idEspecialidad: Number,
    nombreEspecialidad: String,
    codigo: Number
});

prestacionLegacySchema.virtual('nombre').get(function () {
    return this.nombreEspecialidad;
});

export const prestacionLegacy = mongoose.model('prestacionLegacy', prestacionLegacySchema, 'prestacionLegacy');
