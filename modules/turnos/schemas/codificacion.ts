import * as mongoose from 'mongoose';
import * as cie10 from '../../../core/term/schemas/cie10';
import { SnomedConcept } from '../../rup/schemas/snomed-concept';

const codificacionSchema = new mongoose.Schema({
    idPrestacion: {
        type: mongoose.Schema.Types.ObjectId
    },
    asistencia: {
        type: String,
        enum: ['asistio', 'noAsistio', 'sinDatos']
    },
    diagnostico: {
        ilegible: Boolean,
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

export = codificacionSchema;
