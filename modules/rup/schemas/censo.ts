import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let schema = new mongoose.Schema({
    unidadOrganizativa: Object,
    idOrganizacion: String,
    censos: [{
        fecha: Date,
        censo: {
            existencia0: Number,
            ingresos: Number,
            pasesDe: Number,
            pasesA: Number,
            egresosAlta: Number,
            egresosDefuncion: Number,
            existencia24: Number,
            ingresoEgresoDia: Number,
            pacientesDia: Number,
            disponibles24: Number
        }
    }]
});


export let model = mongoose.model('censo', schema, 'censo');
