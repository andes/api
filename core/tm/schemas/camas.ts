import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import * as nombreSchema from './nombre';
import * as estado from './camaEstado';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

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

schema.plugin(AuditPlugin);

export let model = mongoose.model('cama', schema, 'cama');
