import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { PacienteSubSchema } from '../../core-v2/mpi/paciente/paciente.schema';
import { SnomedConcept } from '../rup/schemas/snomed-concept';

const estadosSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada'],
        required: true,
        default: 'vigente'
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
    },
    dispensa: [
        {
            codigo: String,
            descripcion: String,
            cantidad: Number,
            organizacion: {
                id: mongoose.SchemaTypes.ObjectId,
                nombre: String
            }
        }
    ],
    estados: [estadosSchema],
    estadoActual: estadosSchema,
    estadosDispensa: [estadoDispensaSchema],
    estadoDispensaActual: estadoDispensaSchema,
    paciente: PacienteSubSchema,
    renovacion: String, // (referencia al registro original)
    appNotificada: [{ app: String, fecha: Date }]
});

recetaSchema.plugin(AuditPlugin);

recetaSchema.index({
    idPrestacion: 1,
});

export const Receta = mongoose.model('receta', recetaSchema, 'receta');
