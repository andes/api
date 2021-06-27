import * as mongoose from 'mongoose';

export const cacheVacunasAreaProgramaSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    key: {
        type: String,
        required: false
    },
    rango: {
        type: String,
        required: true
    },
    localidad: {
        type: String,
        required: true
    },
    areaPrograma: {
        type: String,
        required: false
    },
    vacunados: Number,
    poblacionObjetivo: Number

});

export const CacheVacunasAreaPrograma = mongoose.model('cacheVacunasAreaPrograma', cacheVacunasAreaProgramaSchema, 'cacheVacunasAreaPrograma');
