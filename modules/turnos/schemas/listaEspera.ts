import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const demandaSchema = new mongoose.Schema({
    profesional: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String
    },
    organizacion: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
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
    fecha: Date, // si es una solicitud es la fecha en que se solicitó, si es demanda rechazada es la fecha en que no se atendió la demanda
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
        observacion: String
    },
    llamados: {}
});

listaEsperaSchema.plugin(AuditPlugin);
listaEsperaSchema.index({ 'paciente.id': 1, 'tipoPrestacion.conceptId': 1, fecha: 1 });

const listaEspera = mongoose.model('listaEspera', listaEsperaSchema, 'listaEspera');

export = listaEspera;
