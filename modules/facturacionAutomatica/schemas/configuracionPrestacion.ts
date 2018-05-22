import * as mongoose from 'mongoose';

var configuracionPrestacionesSchema = new mongoose.Schema({
    id: Object,
    tipoPrestacion: Object,
    nomencladorSUMAR: String,
    nomencladorRecuperoFinanciero: String

});

export let configuracionPrestaciones = mongoose.model('configuracionPrestacion', configuracionPrestacionesSchema, 'configuracionPrestacion');