import * as mongoose            from 'mongoose';
import * as codificadorSchema   from './codificador';
import * as organizacionSchema  from '../../../core/tm/schemas/organizacion';
import * as profesionalSchema   from '../../../core/tm/schemas/profesional';
import * as tipoProblemaSchema  from './tipoProblema';

var problemaSchema = new mongoose.Schema({
    tipoProblema:{
        type: mongoose.Schema.Types.ObjectId
    },
    idProblemaOrigen: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    paciente: {
        type: mongoose.Schema.Types.ObjectId
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

export = problemaSchema;
