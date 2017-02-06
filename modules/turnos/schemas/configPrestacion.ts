import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';


var configPrestacionSchema = new mongoose.Schema({   
    prestacion: {
        // type: nombreSchema,//genera un _id con otro id por eso no quedo asi
        type : {
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
    },
    
    // demandaAccesoDirecto: {
    //     type: Boolean,
    //     default: false
    // },
    // demandaAdmision: {
    //     type: Boolean,
    //     default: false
    // },
    // demandaSeguimiento: {
    //     type: Boolean,
    //     default: false
    // },
    // demandaAutocitado: {
    //     type: Boolean,
    //     default: false
    // }
});

var configPrestacion = mongoose.model('formato', configPrestacionSchema, 'configPrestacion');

export = configPrestacion;
