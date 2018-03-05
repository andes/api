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
    nombre: {
        type: String,
        required: true
    },
    tipoCama: {
        type: SnomedConcept,
        required: true
    },
    equipamiento: [SnomedConcept], // oxigeno / bomba / etc
    estados: [estado.schema]
});

/* Se definen los campos virtuals */
schema.virtual('ultimoEstado').get(function () {
    if (this.estados && this.estados.length > 0) {
        return this.estados[this.estados.length - 1];
    } else {
        return null;
    }

});

const audit = require('../../../mongoose/audit');
schema.plugin(audit);

export let model = mongoose.model('cama', schema, 'cama');
