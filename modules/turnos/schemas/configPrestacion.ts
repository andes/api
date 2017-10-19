import * as mongoose from 'mongoose';
// import * as nombreSchema from '../../../core/tm/schemas/nombre';


let configPrestacionSchema = new mongoose.Schema({
    prestacion: {
        // type: nombreSchema,//genera un _id con otro id por eso no quedo asi
        type: {
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        },
        required: true
    },
    deldiaAccesoDirecto: {
        type: Boolean,
        default: false
    },
    deldiaReservado: {
        type: Boolean,
        default: false
    },
    deldiaAutocitado: {
        type: Boolean,
        default: false
    },

    programadosAccesoDirecto: {
        type: Boolean,
        default: false
    },
    programadosReservado: {
        type: Boolean,
        default: false
    },
    programadosAutocitado: {
        type: Boolean,
        default: false
    }
});

let configPrestacion = mongoose.model('formato', configPrestacionSchema, 'configPrestacion');

export = configPrestacion;
