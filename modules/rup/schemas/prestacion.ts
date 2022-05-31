import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { model, Schema, SchemaTypes, Types } from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { ObraSocialSchema } from '../../obraSocial/schemas/obraSocial';
import { convertToObjectId, iterate } from '../controllers/rup';
import { PrestacionEstadoSchema } from './prestacion.estado';
import * as registro from './prestacion.registro';
import { PrestacionSolicitudHistorialschema } from './prestacion.solicitud.historial';
import { SemanticTag } from './semantic-tag';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';

export const PrestacionSchema = new Schema({
    /**
     * ID de un EVENTO externo (internacion, guardia, embarazo) para agrupar un conjunto de prestaciones referidas a ese evento
     */
    trackId: { required: false, type: Schema.Types.ObjectId },

    /**
     * Clave para agrupar varias prestaciones como un único suceso
     */
    groupId: { required: false, type: Schema.Types.ObjectId },

    inicio: {
        type: String,
        enum: ['top', 'agenda', 'fuera-agenda', 'internacion', 'servicio-intermedio'],
    },


    servicioIntermedioId: { required: false, type: Schema.Types.ObjectId },


    // Datos principales del paciente
    paciente: {
        type: {
            ...PacienteSubSchema,
            telefono: String,
            obraSocial: ObraSocialSchema,
        }
    },
    noNominalizada: {
        type: Boolean,
        required: true,
        default: false
    },
    estadoFacturacion: {
        tipo: String,
        numero: Number,
        numeroComprobante: String,
        estado: String
    },

    metadata: [
        { key: String, valor: SchemaTypes.Mixed }
    ],

    // Datos de la Solicitud
    solicitud: {

        // Fecha de Solicitud: este dato se podría obtener del array de estados, pero está aquí para facilitar la consulta
        fecha: {
            type: Date,
            required: true
        },

        // Ambito de la prestacion: ambulatorio, internacion, emergencia, etc.
        ambitoOrigen: {
            type: String,
            required: false,
            default: 'ambulatorio'
        },

        // Tipo de Prestación a ejecutarse (destino)
        tipoPrestacion: {
            id: Schema.Types.ObjectId,
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: SemanticTag,
            noNominalizada: Boolean
        },
        tipoPrestacionOrigen: {
            id: Schema.Types.ObjectId,
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: SemanticTag
        },

        // ID del turno relacionado con esta prestación
        turno: Schema.Types.ObjectId,

        // Registros de la solicitud ... para los planes o prestaciones futuras
        registros: [registro.schema],

        // Organización Destino de la solicitud.
        organizacion: {
            // requirido, validar en middleware
            id: Schema.Types.ObjectId,
            nombre: String
        },

        organizacionOrigen: {
            id: Schema.Types.ObjectId,
            nombre: String
        },

        // Profesional Destino
        profesional: {
            // requerido, validar en middleware
            id: Schema.Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String
        },

        profesionalOrigen: {
            // requerido, validar en middleware
            id: Schema.Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String
        },

        // ID de la Prestación desde la que se generó esta Solicitud
        prestacionOrigen: {
            type: Schema.Types.ObjectId,
            ref: 'prestacion'
        },


        historial: [PrestacionSolicitudHistorialschema],

        /**
         * Indica si Solicitudes de servicio-intermedio se pueden dar turno o no.
         * Tienen que ser si o si ambito ambulatorio
         * El dato se determina en la regla
         */
        turneable: Boolean,

        /**
         * Id de la regla con la cual matcheo
         */
        reglaId: Types.ObjectId
    },

    // Datos de la ejecución (i.e. realización)
    ejecucion: {
        // Fecha de ejecución
        // Nota: Este dato podría obtener del array de estados, pero está aquí para facilidad de consulta
        fecha: {
            type: Date,
            // requirido, validar en middleware
        },
        // Lugar donde se realiza
        organizacion: {
            // requirido, validar en middleware
            id: Schema.Types.ObjectId,
            nombre: String
        },

        /**
         *  DESTINO DE SOLICITUD
         *      a.  Organización: Si no existe se completa con una copia de ejecucion.registros.createdBy.organizacion.
         *          Si no hay registros se completa con createdBy.organizacion
         *
         *      b.  Profesionales: Si no existe se completa con una copia de solicitud.registros.valor.solicituPrestacion.profesionales.
         *          Si no hay registros se completa con solicitud.profesional
         *
         */

        // Registros de la ejecución
        registros: [registro.schema],

        elementoRUP: SchemaTypes.ObjectId

    },
    tags: Schema.Types.Mixed,
    // Historia de estado de la prestación
    estados: [PrestacionEstadoSchema],
    estadoActual: PrestacionEstadoSchema,
    unidadOrganizativa: SnomedConcept
}, { usePushEach: true } as any);

// Esquema para prestaciones anuladas/modificadas
export const PrestacionHistorialSchema = PrestacionSchema.clone();
PrestacionHistorialSchema.plugin(AuditPlugin);

// Valida el esquema
PrestacionSchema.pre('save', function (next) {
    const prestacion: any = this;
    if (!prestacion.inicio) {
        prestacion.inicio = getInicioPrestacion(prestacion);
    }

    if (!prestacion.solicitud.tipoPrestacion.noNominalizada && !prestacion.paciente.id) {
        const err = new Error('Debe seleccionar el paciente');
        return next(err);
    }

    // Prestación debe tener organización asignada
    // Solicitudes deben tener organización origen asignada
    if (!prestacion.solicitud.organizacion.id && (prestacion.solicitud.tipoPrestacionOrigen.conceptId && prestacion.solicitud.organizacionOrigen.id)) {
        const err = new Error('Debe seleccionar la organizacion desde la cual se solicita');
        return next(err);
    }

    prestacion.estadoActual = prestacion.estados[prestacion.estados.length - 1];
    if (prestacion.estadoActual.tipo === 'ejecucion') {
        if (!prestacion.ejecucion.fecha && !prestacion.createdAt) {
            const err = new Error('Debe seleccionar la fecha en que se solicita');
            return next(err);
        }

        if (!prestacion.ejecucion.organizacion && !prestacion.solicitud.organizacion.id) {
            const err = new Error('Debe seleccionar la organizacion desde la cual se solicita');
            return next(err);
        }
    }

    if (prestacion.ejecucion.registros.length) {
        // Itera todos las todas las propiedades de todos los registros para convertir
        // las propiedades id y _id a ObjectId
        prestacion.ejecucion.registros.forEach(r => {
            iterate(r.valor, convertToObjectId);
        });
    }

    next();
});

function getInicioPrestacion(prestacion) {
    const estadoActual = prestacion.estados[0];
    if (estadoActual.tipo === 'pendiente' || estadoActual.tipo === 'auditoria') {
        return 'top';
    } else {
        if (prestacion.solicitud.ambitoOrigen === 'internacion') {
            return 'internacion';
        } else {
            if (prestacion.solicitud.turno) {
                return 'agenda';
            } else {
                return 'fuera-agenda';
            }
        }
    }
}

function deepSearch(registros: any[], id: string | Types.ObjectId) {
    for (let i = 0; i < registros.length; i++) {
        if (String(id) === String(registros[i].id)) {
            return registros[i];
        } else {
            const reg = deepSearch(registros[i].registros, id);
            if (reg) {
                return reg;
            }
        }
    }
    return null;
}

PrestacionSchema.methods.findRegistroById = function (id: string | Types.ObjectId) {
    const regs = this.ejecucion.registros || [];
    return deepSearch(regs, id);
};

function getAll(registros: any[]) {
    let resultado = [];
    for (let i = 0; i < registros.length; i++) {
        const reg = registros[i];
        resultado = [...resultado, reg];
        if (reg.registros?.length) {
            const rs = getAll(reg.registros);
            resultado = [...resultado, ...rs];
        }
    }
    return resultado;
}

/**
 * Recorre la prestacion y devuelve los registros.
 * @param all devuelve solo los registros base o todos los registros internos.
 */
PrestacionSchema.methods.getRegistros = function (all = false) {
    const registros = this.ejecucion.registros;
    if (all) {
        return getAll(registros);
    } else {
        let registrosInternos = [];
        registros.forEach(reg => {
            if (reg.hasSections) {
                reg.registros.forEach(seccion => {
                    if (seccion.isSection && !seccion.noIndex) {
                        registrosInternos = [
                            ...registrosInternos,
                            ...seccion.registros.map(r => {
                                return {
                                    ...r.toJSON(),
                                    seccion: seccion.concepto
                                };
                            })
                        ];
                    }
                });
            }
        });
        return [...registros, ...registrosInternos];
    }
};

// Habilitar plugin de auditoría
PrestacionSchema.plugin(AuditPlugin);
PrestacionSchema.index({ 'solicitud.turno': 1 });
PrestacionSchema.index({ 'paciente.id': 1, 'estadoActual.tipo': 1 });
PrestacionSchema.index({ groupId: 1 }, { sparse: true });
PrestacionSchema.index({
    'solicitud.organizacion.id': 1,
    'solicitud.ambitoOrigen': 1,
    'ejecucion.fecha': 1,
    'solicitud.tipoPrestacion.conceptId': 1
});
PrestacionSchema.index({
    createdAt: 1,
    'solicitud.organizacion.id': 1,
    'solicitud.organizacionOrigen.id': 1
}, { name: 'TOP-ENTRADA', partialFilterExpression: { inicio: 'top' } });

PrestacionSchema.index({
    createdAt: 1,
    'solicitud.organizacionOrigen.id': 1,
    'solicitud.organizacion.id': 1,
}, { name: 'TOP-SALIDA', partialFilterExpression: { inicio: 'top' } });

PrestacionSchema.index({
    'solicitud.organizacion.id': 1,
    'solicitud.ambitoOrigen': 1,
    'solicitud.tipoPrestacion.conceptId': 1,
    'ejecucion.registros.valor.informeIngreso.fechaIngreso': 1,
}, { sparse: true, name: 'LISTADO-INTERNACIONES' });

PrestacionSchema.index({
    'solicitud.prestacionOrigen': 1,
    'paciente.id': 1
}, { sparse: true });

PrestacionSchema.index({
    'solicitud.organizacionOrigen.id': 1,
    'solicitud.profesionalOrigen.id': 1
}, { name: 'TOP-PROFESIONAL', partialFilterExpression: { inicio: 'top' } });


PrestacionSchema.index(
    {
        servicioIntermedioId: 1,
        'solicitud.fecha': 1,
    }, {
        name: 'SERVICIOS-INTERMEDIO',
        partialFilterExpression: { inicio: 'servicio-intermedio' }
    }
);

export const Prestacion = model('prestacion', PrestacionSchema, 'prestaciones');
export const PrestacionHistorial = model('prestacion-historial', PrestacionHistorialSchema, 'prestacion-historial');

