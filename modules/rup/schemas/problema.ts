import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
// import * as organizacion from '../../../core/tm/schemas/organizacion';
// import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import { segundaOpinionSchema } from './segundaOpinion';

export let problemaSchema = new mongoose.Schema({
    tipoProblema: {
        // type: mongoose.Schema.Types.ObjectId,
        // ref: 'tipoProblema'
        type: mongoose.Schema.Types.Mixed
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
    fechaIdentificacion: Date,
    fechaInicio: Date,
    descripcion: String,
    evoluciones: [{
        fecha: Date,
        observacion: String,
        // profesional: [profesionalSchema],
        profesional:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'profesional'
        },
        organizacion:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'organizacion'
        },
        // organizacion: organizacion.schema,
        // ambito: // TODO
        cronico: Boolean,
        estado: {
            type: String,
            enum: ['activo', 'inactivo', 'resuelto', 'transformado', 'enmendado']
        },
        // campo destinado a segundas opiniones o auditorias de las prestaciones
        segundaOpinion: [segundaOpinionSchema]
    }]
});

export let problema = mongoose.model('problema', problemaSchema, 'problema');
