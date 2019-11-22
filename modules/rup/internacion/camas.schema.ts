import { SchemaTypes, Schema, model } from 'mongoose';
import { SnomedConcept } from '../schemas/snomed-concept';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const INTERNACION_CAPAS = ['medica', 'estadistica', 'enfermeria'];

const CamaSchema = new Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    ambito: String,
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
    equipamiento: [SnomedConcept],
});

CamaSchema.plugin(AuditPlugin);

export const Camas = model('internacionCamas', CamaSchema, 'internacionCamas');
