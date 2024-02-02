import * as mongoose from 'mongoose';
import { SnomedConcept } from '../schemas/snomed-concept';

export const CensoSchema = new mongoose.Schema({
    idOrganizacion: mongoose.Types.ObjectId,
    unidadOrganizativa: String,
    start: Date,
    end: Date,
    censos: [{
        _id: false,
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
            disponibles: Number,
            diasEstada: Number
        }
    }]
});

CensoSchema.index({
    idOrganizacion: 1,
    unidadOrganizativa: 1,
    start: 1,
    end: 1
});

export const Censo = mongoose.model('internacionCensos', CensoSchema, 'internacionCensos');
