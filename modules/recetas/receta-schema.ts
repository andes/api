import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { PacienteSubSchema } from '../../core-v2/mpi/paciente/paciente.schema';
import { Profesional } from '../../core/tm/schemas/profesional';
import { SnomedConcept } from '../rup/schemas/snomed-concept';

export const motivosRecetaSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: false
    }
});

const estadosSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada'],
        required: true,
        default: 'vigente'
    },
    motivo: {
        type: String,
        required: false
    },
    observacion: {
        type: String,
        required: false
    },
    profesional: {
        type: Profesional.schema,
        required: false
    },
    organizacionExterna: {
        id: {
            type: String,
            required: false
        },
        nombre: {
            type: String,
            required: false
        }
    }
});

estadosSchema.plugin(AuditPlugin);

const estadoDispensaSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['sin-dispensa', 'dispensada', 'dispensa-parcial'],
        required: true,
        default: 'sin-dispensa'
    },
    fecha: Date,
    sistema: {
        type: String,
        enum: ['sifaho', 'recetar']
    }
});

export const recetaSchema = new mongoose.Schema({
    organizacion: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String
    },
    profesional: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        profesion: String,
        especialidad: String,
        matricula: Number
    },
    fechaRegistro: Date,
    fechaPrestacion: Date,
    idPrestacion: String,
    idRegistro: String,
    diagnostico: SnomedConcept,
    medicamento: {
        concepto: SnomedConcept,
        presentacion: String,
        unidades: String, // (mg, cc, etc.)
        cantidad: Number,
        cantEnvases: Number,
        dosisDiaria: {
            dosis: String,
            intervalo: mongoose.SchemaTypes.Mixed,
            dias: Number,
            notaMedica: String
        },
        tratamientoProlongado: Boolean,
        tiempoTratamiento: mongoose.SchemaTypes.Mixed,
        tipoReceta: {
            type: String,
            enum: ['duplicado', 'triplicado', 'simple'],
            required: false
        }
    },
    dispensa: [
        {
            descripcion: String,
            cantidad: Number,
            medicamento: SnomedConcept,
            presentacion: String,
            unidades: String,
            cantidadEnvases: Number,
            organizacion: {
                id: String,
                nombre: String
            },
        }
    ],
    estados: [estadosSchema],
    estadoActual: estadosSchema,
    estadosDispensa: [estadoDispensaSchema],
    estadoDispensaActual: estadoDispensaSchema,
    paciente: PacienteSubSchema,
    renovacion: String,
    appNotificada: [{ app: String, fecha: Date }]
});

recetaSchema.pre('save', function (next) {
    const receta: any = this;

    if (receta.estados && receta.estados.length > 0) {
        receta.estadoActual = receta.estados[receta.estados.length - 1];
    }
    if (receta.estadosDispensa && receta.estadosDispensa.length > 0) {
        receta.estadoDispensaActual = receta.estadosDispensa[receta.estadosDispensa.length - 1];
    }

    next();
});

recetaSchema.plugin(AuditPlugin);

recetaSchema.index({
    idPrestacion: 1,
});

export const Receta = mongoose.model('receta', recetaSchema, 'receta');
export const MotivosReceta = mongoose.model('motivosReceta', motivosRecetaSchema, 'motivosReceta');
