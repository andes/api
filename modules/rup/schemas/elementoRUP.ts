import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';

export let schema = new mongoose.Schema({
    // Valor por el cual vamos a leer/guardar en nuestra BD
    key: String,
    // Indica si este elemento está activo
    activo: Boolean,
    // Vinculación al componente de la aplicación Angular
    componente: {
        ruta: String,
        nombre: String
    },
    // Tipo de elemento
    tipo: {
        type: String,
        enum: ['atomo', 'molecula', 'formula']
    },
    // Conceptos SNOMED relacionados que se muestran e implementan de la misma manera.
    // Por ejemplo: "Toma de temperatura del paciente (SCTID: 56342008)" y
    //              "Toma de temperatura rectal del paciente (SCTID: 18649001")
    //              se implementan con el mismo elemento RUP "Toma de temperatura"
    conceptos: [SnomedConcept],
    // Elementos RUP requeridos para la ejecución.
    // Por ejemplo, en "Control de Niño sano" es obligatorio ejecutar "Toma de peso"
    requeridos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'elementoRUP'
    }],
    // Elementos RUP más frecuentes para la ejecución.
    // Por ejemplo, en "Consulta de medicina general" se puede sugerir ejecutar "Signos vitales"
    frecuentes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'elementoRUP'
    }]
});

export let elementoRUP = mongoose.model('elementoRUP', schema, 'elementosRUP');

