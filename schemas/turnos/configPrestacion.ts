import * as mongoose from 'mongoose';


var configPrestacionSchema = new mongoose.Schema({   
    prestacion: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    
    deldiaAccesoDirecto: Boolean,
    deldiaAdmision: Boolean,
    deldiaSeguimiento: Boolean,
    deldiaAutocitado: Boolean,

    programadosAccesoDirecto: Boolean,
    programadosAdmision: Boolean,
    programadosSeguimiento: Boolean,
    programadosAutocitado: Boolean,
    
    demandaAccesoDirecto: Boolean,
    demandaAdmision: Boolean,
    demandaSeguimiento: Boolean,
    demandaAutocitado: Boolean
    
});

var configPrestacion = mongoose.model('formato', configPrestacionSchema, 'configPrestacion');

export = configPrestacion;
