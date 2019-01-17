import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    turno: {
        _id: String,
    },
    paciente: {
        nombre: String,
        apellido: String,
        dni: String,
        fechaNacimiento: Date,
        sexo: String
    },
    prestacion: {
        conceptId: String,
        term: String,
        fsn: String,
        datosReportables: [
            {
                conceptId: String,
                term: String,
                valor: {
                    conceptId: String,
                    nombre: String
                }
            },
        ]
    },
    organizacion: {
        nombre: String,
        cuie: String,
        idSips: String
    },
    obraSocial: {
        codigoFinanciador: String,
        financiador: String
    },
    profesional: {
        nombre: String,
        apellido: String,
        dni: String,
    }
});

// let model = mongoose.model('configFacturacionAutomatica', schema, 'configFacturacionAutomatica');
// export = model;