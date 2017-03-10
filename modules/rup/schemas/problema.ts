import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import { organizacionSchema } from '../../../core/tm/schemas/organizacion';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import * as tipoProblemaSchema from './tipoProblema';
import { segundaOpinionSchema } from './segundaOpinion';

export let problemaSchema = new mongoose.Schema({
    tipoProblema: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tipoProblema'
    },
    idProblemaOrigen: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    paciente:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'paciente'
    },
    codificador: codificadorSchema,
    fechaInicio: Date,
    evoluciones: [{
        fecha: Date,
        observacion: String,
        profesional: [profesionalSchema],
        organizacion: organizacionSchema,
        //ambito: // TODO
        duracion: {
            type: String,
            enum: ['cronico', 'agudo']
        },
        vigencia: {
            type: String,
            enum: ['activo', 'inactivo', 'resuelto', 'transformado', 'enmendado']
        },
        // campo destinado a segundas opiniones o auditorias de las prestaciones
        segundaOpinion: [segundaOpinionSchema]
    }]
});

export let problema = mongoose.model('problema', problemaSchema, 'problema');
