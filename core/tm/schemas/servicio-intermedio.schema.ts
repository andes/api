import { model, Schema } from 'mongoose';
import { SnomedConceptRaw } from '../../../modules/rup/schemas/snomed-concept';
import { ConceptoTurneableSchema } from './tipoPrestacion';

/**
 * Esquema de servicio intermedio.
 * No siempre el espectro de concepto turneables abarca todos los procedimientos asociados.
 */

export const ServicioIntermedioSchema = new Schema({
    nombre: String,
    concepto: { required: false, type: SnomedConceptRaw },
    conceptosTurneables: [ConceptoTurneableSchema], // Agendas del servicio intermedio.
    procedimientos: [SnomedConceptRaw], // procedimientos snomed asociados al servicio intermedio.
    /** ECL SNOMED usada para poblar `procedimientos` en el servidor (opcional). */
    procedimientosEcl: { type: String, required: false }
});

export const ServicioIntermedio = model('rup-servicios-intermedio', ServicioIntermedioSchema, 'rup-servicios-intermedio');
