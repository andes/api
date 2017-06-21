import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';

// Cada registro contiene la información usuario que lo creó (plugin audit)
// y un array de los valores generados por los elementos RUP correspondientes.
// Esto permite que múltiples usuarios generen registros para la ejecución de una prestación
// Ej: en "Control de niño sano" el médico, el odontólogo y el enfermero generan tres registros.
export let schema = new mongoose.Schema({
    // Contiene los valores de los elementos RUP
    valores: [{
        concepto: SnomedConcept,
        elementoRup: mongoose.Schema.Types.ObjectId,
        valor: mongoose.Schema.Types.Mixed,
        relacionadoCon: [SnomedConcept]
    }]
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));
