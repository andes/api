import * as mongoose from 'mongoose';

let configuracionPrestacionesSchema = new mongoose.Schema({
    id: Object,
    snomed: Object,
    nomencladorRecuperoFinanciero: String,
    nomencladorSUMAR : {
        codigo : String,
        id : Number
    }
});

export let configuracionPrestaciones = mongoose.model('configuracionPrestaciones', configuracionPrestacionesSchema, 'configFacturacionAutomatica');
