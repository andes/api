import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { pacienteSchema } from '../../mpi/schemas/paciente';
import * as nombreSchema from './nombre';
import * as estado from './camaEstado';
import * as unidadOrganizativa from './unidadOrganizativa';

export let schema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    sector: {
        type: String,
        required: true
    },
    habitacion: {
        type: String,
        required: true
    },
    numero: {
        type: String,
        required: true
    },
    unidadesOrganizativas: [unidadOrganizativa.schema],
    tipoCama: {
        type: SnomedConcept,
        required: true
    },
    esCensable: {
        type: Boolean,
        required: true,
        default: true
    },
    equipamiento: [SnomedConcept], // oxigeno / bomba / etc
    // ultimo estado de la cama
    ultimoEstado: estado.schema,
    estados: [estado.schema]
});

const audit = require('../../../mongoose/audit');
schema.plugin(audit);

export let model = mongoose.model('cama', schema, 'cama');
