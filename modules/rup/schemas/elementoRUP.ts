import { SemanticTag } from './semantic-tag';
import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';

export let schema = new mongoose.Schema({
    // Indica si este elemento está activo
    activo: {
        type: Boolean,
        required: true
    },
    // Vinculación al componente de la aplicación Angular
    componente: {
        type: String,
        required: true
    },
    // Indica los semantic tags para los cuales este elemento es el registro por default
    defaultFor: [String],
    // Tipo de elemento
    tipo: {
        type: String,
        enum: ['atomo', 'molecula', 'formula']
    },
    // Indica si este elementoRUP aplica a una solicitud
    esSolicitud: {
        type: Boolean,
        required: true,
        default: false
    },
    // Indica los parámetros para instanciar el componente en formato {key: value}
    params: {
        type: mongoose.Schema.Types.Mixed,
        validate: {
            validator(value) {
                if (value === null) {
                    return true;
                } else {
                    return Object.isObject(value);
                }
            },
            message: '{VALUE} is not a valid object'
        }
    },
    // Indica el estilo para aplicar al componente
    style: {
        columns: {
            type: Number,
            default: 12
        },
        cssClass: String
    },
    // Conceptos SNOMED relacionados que se muestran e implementan de la misma manera.
    // Por ejemplo: "Toma de temperatura del paciente (SCTID: 56342008)" y
    //              "Toma de temperatura rectal del paciente (SCTID: 18649001")
    //              se implementan con el mismo elemento RUP "Toma de temperatura"
    conceptos: [SnomedConcept],
    // Elementos RUP requeridos para la ejecución.
    // Por ejemplo, en "Control de Niño sano" es obligatorio ejecutar "Toma de peso"
    requeridos: [SnomedConcept],
    // Elementos RUP más frecuentes para la ejecución.
    // Por ejemplo, en "Consulta de medicina general" se puede sugerir ejecutar "Signos vitales"
    frecuentes: [SnomedConcept],
});

export let elementoRUP = mongoose.model('elementoRUP', schema, 'elementosRUP');

