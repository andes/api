import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';

export let schema = new mongoose.Schema({
    fecha: Date,
    esPrestamo: Boolean,
    unidadOrganizativa: SnomedConcept,
    observaciones: String
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
