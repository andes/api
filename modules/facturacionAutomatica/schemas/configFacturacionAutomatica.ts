import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    nomencladorRecuperoFinanciero: String,
    snomed: [{ term: String, conceptId: String }],
    idServicio: String,
    nomencladorSUMAR: {
        diagnostico: [{ conceptId: String, diagnostico: String, predomina: Boolean }],
        datosReportables: [{ idDatosReportables: String, valores: [{ conceptId: String, valor: String }] }],
        codigo: String,
        id: String
    }
});

let model = mongoose.model('configFacturacionAutomatica', schema, 'configFacturacionAutomatica');
export = model;
