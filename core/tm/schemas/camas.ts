import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { pacienteSchema } from '../../mpi/schemas/paciente';
import { camaEstado } from './camaEstado';

export let schema = new mongoose.Schema({
    sector: {
        type: Number,
        required: true
    },
    habitacion: {
        type: Number,
        required: true
    },
    numero: {
        type: Number,
        required: true
    },
    servicio: SnomedConcept,
    tipoCama: {
        type: SnomedConcept,
        required: true
    },
    equipamiento: [SnomedConcept], // oxigeno / bomba / etc
    // ultimo estado de la cama
    ultimoEstado: camaEstado.schema
    // {
        // estado: {
        //     type: String,
        //     enum: ['ocupada', 'desocupada', 'desinfectada', 'libre', 'reparacion', 'bloqueada'],
        //     required: true,
        //     default: 'desocupada'
        // },
        // paciente: {pacienteSchema},
        // idInternacion: {
        //     // id de la internacion definir.
        // },
        // observaciones: {
        //     type: String
        // }
    // }
});

const audit = require('../../../mongoose/audit');
schema.plugin(audit);
