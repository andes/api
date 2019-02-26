import * as mongoose from 'mongoose';
import { SnomedConcept, ISnomedConcept } from './snomed-concept';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as estado from './camaEstado';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let schema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    unidadOrganizativaOriginal: {
        type: SnomedConcept,
        required: true
    },
    sectores: [{
        tipoSector: SnomedConcept,
        unidadConcept: {
            type: SnomedConcept,
            required: false
        },
        nombre: String
    }],
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
        this.estados.sort((a, b) => {
            return a.fecha - b.fecha;
        });
        return this.estados[this.estados.length - 1];
    } else {
        return null;
    }
});

schema.plugin(AuditPlugin);

export let model = mongoose.model('cama', schema, 'cama');
