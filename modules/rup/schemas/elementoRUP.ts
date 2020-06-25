import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

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
        enum: ['atomo', 'molecula', 'formula', 'prestacion']
    },
    // Calculo de formula a implementar
    formulaImplementation: {
        type: String,
        required: false
    },
    // Indica si este elementoRUP aplica a una solicitud
    esSolicitud: {
        type: Boolean,
        required: true,
        default: false
    },

    // Indica si este elementoRUP requiere indicar diagnostico principal
    requiereDiagnosticoPrincipal: {
        type: Boolean,
        required: false,
        default: true
    },

    // Parámetros generales a la hora de iniciar la prestación
    /**
     * titulo: label parametrizado
     * required: Por lo general indica un input como requerido
     * showterm: Muestra el term del concepto como label
     * refsetid: En algunos casos se puede elegir conceptos desde un refset (deprecado). usar Query.
     * query: Query a ejecutar para elegir o permitir conceptos. Depende donde se use la funcionalidad.
     * reglas (?) se usa en indice de masa corporal
     * icon: Icono de la secciones
     * grupo: Se usa en lactancia
     * defaultOptions: Opciones para renderizar un radioButton. Molecula 'Selección binaria'.
     * plexRadioType: Tipo de radiobutton a utilizar. Molecula 'Selección binaria'.
     * tipoSelect: Valores: select|radio -> renderiza uno o el otro en el componente SelectPorRefset
     * titleOverride: Muestra un titulo como label (Atomo valorNumerico).
     * unit: Unidad establecida en Atomo valorNumerico.
     * min: valor minimo para componente valorNumerico
     * max: valor maximo para componente valorNumerico
     */

    params: {
        type: mongoose.Schema.Types.Mixed,
        validate: {
            validator(value) {
                if (value === null) {
                    return true;
                } else {
                    return typeof value === 'object';
                }
            },
            message: '{VALUE} is not a valid object'
        }
    },
    // Conceptos SNOMED relacionados que se muestran e implementan de la misma manera.
    // Por ejemplo: "Toma de temperatura del paciente (SCTID: 56342008)" y
    //              "Toma de temperatura rectal del paciente (SCTID: 18649001")
    //              se implementan con el mismo elemento RUP "Toma de temperatura"
    conceptos: [SnomedConcept],
    // Elementos RUP requeridos para la ejecución.
    // Por ejemplo, en "Control de Niño sano" es obligatorio ejecutar "Toma de peso"
    requeridos: [
        {
            elementoRUP: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'elementoRUP'
            },
            concepto: SnomedConcept,
            // Indica estilos para la instancia del elementoRUP
            style: {
                columns: {
                    type: Number,
                    default: 12
                },
                cssClass: String
            },
            // Indica parámetros para la instancia del elementoRUP en formato {key: value}
            params: {
                type: mongoose.Schema.Types.Mixed,
                validate: {
                    validator(value) {
                        if (value === null) {
                            return true;
                        } else {
                            return typeof value === 'object';
                        }
                    },
                    message: '{VALUE} is not a valid object'
                }
            },
        }
    ],
    // Elementos RUP más frecuentes para la ejecución.
    // Por ejemplo, en "Consulta de medicina general" se puede sugerir ejecutar "Signos vitales"
    frecuentes: [SnomedConcept],

    informe: {
        type: mongoose.Schema.Types.Mixed
    },

    inactiveAt: {
        type: mongoose.SchemaTypes.Date,
        required: false
    }
});

// Autopopula todos los hijos
schema.pre('find', function (next) {
    this.populate('requeridos.elementoRUP');
    next();
});

schema.plugin(AuditPlugin);

export let elementoRUP = mongoose.model('elementoRUP', schema, 'elementosRUP');

