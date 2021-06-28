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
    idZona: mongoose.Schema.Types.ObjectId,
    zona: String,
    areaPrograma: {
        type: String,
        required: false
    },
    vacunados: Number,
    poblacionObjetivo: Number

});

export const CacheVacunasAreaPrograma = mongoose.model('cacheVacunasAreaPrograma', cacheVacunasAreaProgramaSchema, 'cacheVacunasAreaPrograma');
