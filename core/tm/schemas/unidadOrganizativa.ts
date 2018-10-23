import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let schema = new mongoose.Schema({
    fecha: Date,
    esPrestamo: Boolean,
    unidadOrganizativa: SnomedConcept,
    observaciones: String
});

// Habilitar plugin de auditoría
schema.plugin(AuditPlugin);
