import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { model, Schema } from 'mongoose';

export const ServicioIntermedioSchema = new Schema({
    nombre: String,
    tipoPrestacion: [SnomedConcept],
    concepto: { required: false, type: SnomedConcept }
});

export const ServicioIntermedio = model('rup-servicios-intermedio', ServicioIntermedioSchema, 'rup-servicios-intermedio');
