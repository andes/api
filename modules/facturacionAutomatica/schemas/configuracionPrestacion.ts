import * as mongoose from 'mongoose';

var configuracionPrestacionesSchema = new mongoose.Schema({
    id: Object,
    tipoPrestacion: Object,
    nomencladorRecuperoFinanciero: String,
    nomencladorSUMAR : {
        codigo : String,
        id : Number
    }
});

export let configuracionPrestaciones = mongoose.model('configuracionPrestacion', configuracionPrestacionesSchema, 'configuracionPrestacion');