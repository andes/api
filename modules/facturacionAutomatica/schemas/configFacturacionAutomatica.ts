import * as mongoose from 'mongoose';

const schema = new mongoose.Schema({
    // nomencladorRecuperoFinanciero: String,
    // snomed: [{ term: String, conceptId: String }],
    // idServicio: String,
    // nomencladorSUMAR: {
    //     diagnostico: [{ conceptId: String, diagnostico: String, predomina: Boolean }],
    //     datosReportables: [{ idDatosReportables: String, valores: [{ conceptId: String, valor: String, expresion: String }] }],
    //     codigo: String,
    //     id: String
    // }
    expresionSnomed: { type: String },
    prestacionSnomed: [{ term: String, conceptId: String }],
    recuperoFinanciero: {
        descripcion: { type: String },
        idNomenclador: { type: String },
        codigo: { type: String },
        idServicio: { type: String }
    },
    sumar: {
        descripcion: { type: String },
        codigo: { type: String },
        diagnostico: mongoose.Schema.Types.Mixed,
        datosReportables: [{ idDatosReportables: String, valores: [{ conceptId: String, valor: String, expresion: String }] }],
        idNomenclador: { type: String }
    }
});

const model = mongoose.model('configFacturacionAutomatica', schema, 'configFacturacionAutomatica');
export = model;
