import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { pacienteSchema } from '../../mpi/schemas/paciente';

let schema = new mongoose.Schema({
    idpadre: String,
    descripcion: String,
    nivelComplejidad: String,
    especialidades: [String],
    requisitos: String,
    carroEmergencia: Boolean,
    recomendaciones: String,
    indicaciones: String,
    comentario: String,
    conceptId: String
    // padre: {
    //     nombre: String,
    //     conceptId: String,
    // },
    // nombre: String,
    // conceptId: String,
    // capitulo: Number,
    // nombre: String,
    // medicamentos: [{
    //         clasificacion: String,
    //         numero: Number,
    //         nivelComplejidad: String,
    //         recomendaciones: String,
    //         especialidades: [String], // enum?
    //         requisitos: String, // enum
    //         carroEmergencia: Boolean,
    //         indicaciones: String, // estandarizar?
    //         comentario: String, // estandarizar?
    //         concepto: {
    //             conceptId: String,
    //             term: String,
    //             fsn: String,
    //             semanticTag: String,
    //             words: [String]
    //         }
    //     }]
    // }]
});

// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

// Exportar modelo
let model = mongoose.model('formularioTerapeutico', schema, 'formularioTerapeutico');

export = model;
