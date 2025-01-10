import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';
import { SnomedConcept } from '../schemas/snomed-concept';

const estadosSchema = new mongoose.Schema({
    estado: {
        type: String,
        enum: ['vigente', 'dispensada', 'vencida', 'suspendida',],
        required: true,
        default: 'vigente'
    },
});
estadosSchema.plugin(AuditPlugin);

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
    estados: [estadosSchema],
    estadoActual: {
        type: String,
        required: true,
        default: 'vigente'
    },
    paciente: PacienteSubSchema,
    renovacion: String, // (referencia al registro original)
    vinculoRecetar: String,
    vinculoSifaho: String
});

recetaSchema.plugin(AuditPlugin);

recetaSchema.index({
    idPrestacion: 1,
});

export const Receta = mongoose.model('receta', recetaSchema, 'receta');
