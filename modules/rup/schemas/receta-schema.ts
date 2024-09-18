import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { SnomedConcept } from './snomed-concept';
import { ProfesionalSubSchema } from '../../../core/tm/schemas/profesional';
import { PacienteSchema, PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';
// para utilizar este esquema: import * as registro from './receta-schema';

export const recetaSchema = new mongoose.Schema();

const estadosSchema = new mongoose.Schema({
    estado: {
        type: String,
        enum: ['vigente', 'dispensada', 'vencida'],
        required: true,
        default: 'vigente'
    },
});
estadosSchema.plugin(AuditPlugin);

recetaSchema.add({
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
    fechaPrestación: Date,
    idPrestacion: String,
    idRegistro: String,
    medicamentos: [{
        conceptId: String,
        term: String, // (Descripción)
        presentacion: String,
        unidades: Number,
        cantidad: Number,
    }],
    estados: estadosSchema,
    paciente: PacienteSchema.methods.basicos(),
    renovacion: String, // (referencia al registro original)
    vinculoRecetar: String,
    vinculoSifaho: String
});

recetaSchema.plugin(AuditPlugin);

export const Receta = mongoose.model('receta', recetaSchema, 'receta');
