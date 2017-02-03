import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import { organizacionSchema } from '../../../core/tm/schemas/organizacion';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import * as tipoProblemaSchema from './tipoProblema';

var problemaSchema = new mongoose.Schema({
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
        activo: Boolean,
        observacion: String,
        profesional: [profesionalSchema],
        organizacion: organizacionSchema,
        //ambito: // TODO
    }]
});

var problema = mongoose.model('problema', problemaSchema, 'problema');

export = problema;
