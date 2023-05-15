import * as mongoose from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';

const listaEsperaSchema = new mongoose.Schema({
    paciente: PacienteSubSchema,
    tipoPrestacion: { type: tipoPrestacionSchema },
    profesional: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String
    },
    organizacion: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    fecha: Date, // si es una solicitud es la fecha en que se solicitó
    // si es demanda rechazada es la fecha en que no se atendió la demanda
    vencimiento: Date,
    estado: String, // Enumerado {solicitud, demandaRechazada}  hay oferta en el mes / no hay
    origen: String
});

const listaEspera = mongoose.model('listaEspera', listaEsperaSchema, 'listaEspera');

export = listaEspera;
