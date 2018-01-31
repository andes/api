import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { pacienteSchema } from '../../mpi/schemas/paciente';

let schema = new mongoose.Schema({
    capitulo: Number,
    nombre: String,
    subcapitulos: [{
        numero: Number,
        nombre: String, 
        medicamentos: [{
            clasificacion: String,
            numero: Number,
            nivelComplejidad: String,
            recomendaciones: String,
            especialidades: [String], // enum?
            requisitos: String, // enum
            carroEmergencia: Boolean,
            indicaciones: String, // estandarizar?
            comentario: String, // estandarizar?            
            conceptId: String
        }]
    }]
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

// Exportar modelo
let model = mongoose.model('formulario', schema, 'formulario');

export = model;


