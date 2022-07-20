import { AndesDoc, AuditPlugin } from '@andes/mongoose-plugin-audit';
import { model, Schema, SchemaTypes } from 'mongoose';
import { PacienteSubSchema } from '../../../../core-v2/mpi';
import { ProfesionalSubSchema } from '../../../../core/tm/schemas/profesional';
import { NombreSchemaV2 } from '../../../../shared/schemas';
import { SnomedConcept } from '../../schemas/snomed-concept';

export interface IPlanIndicaciones { }

export type IPlanIndicacionesDoc = AndesDoc<IPlanIndicaciones>;

export const PlanIndicacionesEstadoSchema = new Schema({
    tipo: {
        type: String,
        enum: ['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft', 'unknown', 'edited']
    },
    fecha: Date,
    observaciones: String,
    verificacion: {
        estado: {
            type: String,
            enum: ['aceptada', 'rechazada']
        },
        motivoRechazo: String
    }
}, { _id: false });

PlanIndicacionesEstadoSchema.plugin(AuditPlugin);

export const PlanIndicacionesSchema = new Schema({
    idInternacion: SchemaTypes.ObjectId,
    elementoRUP: SchemaTypes.ObjectId,
    paciente: PacienteSubSchema,
    ambito: String,
    capa: String,
    organizacion: {
        type: NombreSchemaV2,
        required: true
    },
    profesional: ProfesionalSubSchema,
    idPrestacion: SchemaTypes.ObjectId,
    idRegistro: SchemaTypes.ObjectId,
    concepto: SnomedConcept,
    nombre: String,
    fechaInicio: Date,
    fechaBaja: {
        type: Date,
        default: null
    },
    valor: SchemaTypes.Mixed,
    estados: [PlanIndicacionesEstadoSchema],
    estadoActual: PlanIndicacionesEstadoSchema,
    turneable: Boolean,
    seccion: SnomedConcept
});

PlanIndicacionesSchema.plugin(AuditPlugin);

PlanIndicacionesSchema.pre('save', function (next) {
    const indicacion: any = this as any;
    indicacion.estadoActual = indicacion.estados[indicacion.estados.length - 1];
    const completedStates = ['stopped', 'cancelled', 'completed'];
    if (completedStates.includes(indicacion.estadoActual.tipo)) {
        indicacion.fechaBaja = indicacion.estadoActual.fecha;
    }
    next();
});

export const PlanIndicaciones = model('internacionPlanIndicaciones', PlanIndicacionesSchema, 'internacionPlanIndicaciones');


export const PlanIndicacionesEventosSchema = new Schema({
    idInternacion: SchemaTypes.ObjectId,
    idIndicacion: {
        type: SchemaTypes.ObjectId,
        es_indexed: true
    },
    fecha: Date,
    estado: String,
    observaciones: String,
    idPrestacion: SchemaTypes.ObjectId,
});

PlanIndicacionesEventosSchema.plugin(AuditPlugin);
PlanIndicacionesEventosSchema.index({ idIndicacion: 1 });

export const PlanIndicacionesEventos = model('internacionPlanIndicacionesEventos', PlanIndicacionesEventosSchema, 'internacionPlanIndicacionesEventos');
