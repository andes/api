import * as mongoose from 'mongoose';

export const nomivacVacunaSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigo: {
        type: Number,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    calendarioNacional: String,
    codigoNomencladorNacer: String,
    vigenciaDesde: Date,
    vigenciaHasta: Date,
    orden: String,
    habilitado: {
        type: Boolean,
        required: true,
        default: false
    },
    codigoSUMAR: String,
    snomed_conceptId: String
});

nomivacVacunaSchema.index({
    codigo: 1
});
export let nomivacVacunas = mongoose.model('nomivacVacunas', nomivacVacunaSchema, 'nomivacVacunas');
