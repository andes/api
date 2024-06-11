import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
const profesionalSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    apellido: String
});
const organizacionSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String
});
const demandaSchema = new mongoose.Schema({
    profesional: profesionalSchema,
    organizacion: organizacionSchema,
    motivo: String,
    fecha: Date,
    origen: {
        type: String,
        required: true,
        default: 'citas'
    }
});

demandaSchema.plugin(AuditPlugin);

const listaEsperaSchema = new mongoose.Schema({
    paciente: PacienteSubSchema,
    tipoPrestacion: { type: tipoPrestacionSchema },
    fecha: Date,
    vencimiento: Date,
    estado: {
        type: String, enum: ['pendiente', 'resuelto', 'vencido'],
        required: true,
        default: 'pendiente'
    },
    demandas: [demandaSchema],
    resolucion: {
        fecha: Date,
        motivo: String,
        observacion: String,
        turno: {
            type: {
                id: mongoose.Schema.Types.ObjectId,
                horaInicio: Date,
                tipo: String,
                emitidoPor: String,
                fechaHoraDacion: Date,
                profesionales: [profesionalSchema],
                idAgenda: mongoose.Schema.Types.ObjectId,
                organizacion: organizacionSchema
            },
            required: false
        }
    }
});

listaEsperaSchema.plugin(AuditPlugin);
listaEsperaSchema.index({ 'paciente.id': 1, 'tipoPrestacion.conceptId': 1, fecha: 1 });

export const listaEspera = mongoose.model('listaEspera', listaEsperaSchema, 'listaEspera');
export const demanda = mongoose.model('demanda', demandaSchema);
