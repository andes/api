import * as mongoose from 'mongoose';
import * as cie10 from '../../../core/term/schemas/cie10';
import { SnomedConcept } from './snomed-concept';

const codificacionSchema = new mongoose.Schema({
    idPrestacion: {
        type: mongoose.Schema.Types.ObjectId
    },
    diagnostico: {
        codificaciones: [{
            // (ver schema) solamente obtenida de RUP o SIPS y definida por el profesional
            codificacionProfesional: {
                cie10: cie10.schema,
                snomed: SnomedConcept
            },
            // (ver schema) corresponde a la codificación establecida la instancia de revisión de agendas
            codificacionAuditoria: cie10.schema,
            primeraVez: Boolean,
        }]
    }
});

export let codificacion = mongoose.model('codificacion', codificacionSchema, 'codificacion');
