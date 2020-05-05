import * as mongoose from 'mongoose';
import * as constantes from '../schemas/constantes';
import { SnomedConcept } from './../../../modules/rup/schemas/snomed-concept';
import { NombreApellidoSchema } from './../../../core/tm/schemas/nombreApellido';

let schema = new mongoose.Schema();
schema.add({
    nombre: {
        type: String,
        required: true,
    },
    concepto: {
        type: SnomedConcept,
        required: true,
    },
    valor: mongoose.Schema.Types.Mixed,
    registros: [schema],    
    elementoRUP: mongoose.SchemaTypes.ObjectId,
});


let seguimientoPacientesSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    paciente: {
        fechaAutodiagnostico: {
            type: Date,
            es_indexed: true
        },
        documento: {
            type: String,
            es_indexed: true
        },
        sexo: constantes.SEXO,
        registros: schema
    },
    profesional: NombreApellidoSchema   
});


export let seguimientoPacientes = mongoose.model('seguimientoPacientes', seguimientoPacientesSchema, 'seguimientoPacientes');


