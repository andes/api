import * as mongoose from 'mongoose';
import { SnomedConcept } from '../schemas/snomed-concept';

export let schema = new mongoose.Schema({
    idOrganizacion: mongoose.Types.ObjectId,
    unidadOrganizativa: {
        type: SnomedConcept,
        required: true
    },
    start: Date,
    end: Date,
    censos: [{
        fecha: Date,
        censo: {
            existenciaALas0: Number,
            ingresos: Number,
            pasesDe: Number,
            altas: Number,
            defunciones: Number,
            pasesA: Number,
            existenciaALas24: Number,
            ingresosYEgresos: Number,
            pacientesDia: Number,
            disponibles: Number
        }
    }]
});


export const Censos = mongoose.model('internacionCenso', schema, 'internacionCenso');
