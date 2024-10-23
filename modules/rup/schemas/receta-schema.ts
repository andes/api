import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';

const estadosSchema = new mongoose.Schema({
    estado: {
        type: String,
        enum: ['vigente', 'dispensada', 'vencida'],
        required: true,
        default: 'vigente'
    },
});
estadosSchema.plugin(AuditPlugin);

export const recetaSchema = new mongoose.Schema({
    organizacion: {
        id: String,
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
    medicamento: {
        conceptId: String,
        term: String, // (Descripción)
        presentacion: String,
        unidades: String, // (mg, cc, etc.)
        cantidad: Number,
        cantEnvases: Number,
        dosisDiaria: {
            frecuencia: {},
            dias: Number,
            notaMedica: String
        },
        tratamientoProlongado: Boolean,
        tiempoTratamiento: {},
    },
    estados: [estadosSchema],
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
