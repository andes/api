import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';


// Cada registro contiene la información usuario que lo creó (plugin audit)
// y los valores generados por los elementos RUP correspondientes.
// Esto permite que múltiples usuarios generen registros para la ejecución de una prestación
// Ej: en "Control de niño sano" el médico, el odontólogo y el enfermero generan tres registros.
export let schema = new mongoose.Schema();
schema.add({
    // Indica el nombre del registro, calculado por el elementoRUP.
    // Ejemplo: 'Prescripción de novalgina'
    nombre: {
        type: String,
        required: true,
    },
    concepto: {
        type: SnomedConcept,
        required: true,
    },
    // Indica si este registro está destacado
    destacado: {
        type: Boolean,
        required: true,
        default: false
    },
    // Indica si este registro es una solicitud
    esSolicitud: {
        type: Boolean,
        required: true,
        default: false
    },
    esDiagnosticoPrincipal: {
        type: Boolean,
        default: false
    },

    isEmpty: Boolean,
    /**
     * Por ahora un schema sensillo para marcar un concepto como privado
     *
     * public: Visible para todos
     * private: Visible para uno mismo solamente
     * termOnly: Solo se puede ver el term del concepto, y no su contenido
     *
     */
    privacy: {
        scope: {
            type: String,
            enum: ['private', 'public', 'termOnly'],
            default: 'public'
        }
    },
    esPrimeraVez: Boolean,
    // Almacena el valor del átomo, molécula o fórmula.
    // Para el caso de las moléculas, el valor puede ser nulo.
    valor: mongoose.Schema.Types.Mixed,
    // Almacena los registros de los átomos asociados a la molécula
    registros: [schema],
    // Indica los id de otros registros dentro array 'registros' de la prestación
    // O un conceptId si el registro está relacionado con un concepto (ej: un registro de "caries" con concepto "diente 18")
    relacionadoCon: [mongoose.Schema.Types.Mixed],

    /**
     * ID del ElementoRUP utilizado
     */
    elementoRUP: mongoose.SchemaTypes.ObjectId,
    hasSections: Boolean,
    isSection: Boolean,
    noIndex: Boolean
});

// Habilitar plugin de auditoría
schema.plugin(AuditPlugin);
