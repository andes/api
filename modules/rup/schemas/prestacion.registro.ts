import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';

// Cada registro contiene la información usuario que lo creó (plugin audit)
// y los valores generados por los elementos RUP correspondientes.
// Esto permite que múltiples usuarios generen registros para la ejecución de una prestación
// Ej: en "Control de niño sano" el médico, el odontólogo y el enfermero generan tres registros.
export let schema = new mongoose.Schema({
    // Contiene los valores de los elementos RUP
    concepto: {
        type: SnomedConcept,
        required: true,
    },
    valor: mongoose.Schema.Types.Mixed,
    destacado: Boolean,
    relacionadoCon: SnomedConcept,
    tipo: String
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
