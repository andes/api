import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const schema = new mongoose.Schema({
    idpadre: {
        type: mongoose.Schema.Types.ObjectId,
    },
    descripcion: String,
    nivelComplejidad: String,
    especialidades: [String],
    requisitos: String,
    carroEmergencia: String,
    recomendaciones: String,
    indicaciones: String,
    comentario: String,
    conceptId: String,
    borrado: Boolean,
    concepto: Object
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
schema.plugin(AuditPlugin);

// Exportar modelo
const model = mongoose.model('formularioTerapeutico', schema, 'formularioTerapeutico');

export = model;
