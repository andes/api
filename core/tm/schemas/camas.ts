import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { pacienteSchema } from '../../mpi/schemas/paciente';

export let schema = new mongoose.Schema({
    sector: Number,
    habitacion: Number,
    numero: Number,
    servicio: SnomedConcept,
    tipoCama: SnomedConcept,
    equipamiento: [SnomedConcept], // oxigeno / bomba / etc
    // ultimo estado de la cama
    ultimoEstado: {
        estado: {
            type: String,
            enum: ['ocupada', 'desocupada', 'desinfectada', 'libre', 'reparacion', 'bloqueada'],
            required: true,
            default: 'desocupada'
        },
        paciente: {pacienteSchema},
        idInternacion: {
            // id de la internacion definir.
        },
        observaciones: {
            type: String
        }
    }
});


