import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { pacienteSchema } from '../../mpi/schemas/paciente';

export let schema = new mongoose.Schema({
    numeroCapitulo: Number,
    nombre: String,
    subcapitulos: [{
        nombre: String, 
        clasificacion: String,
        medicamentos: [{
            nivelComplejidad: String,
            recomendaciones: String,
            especialidad: String, // enum?
            requisitos: String, // enum
            carroEmergencia: Boolean,
            indicaciones: String, // estandarizar?
            comentario: String, // estandarizar?            
            conceptId: String
        }]
    }]
});


