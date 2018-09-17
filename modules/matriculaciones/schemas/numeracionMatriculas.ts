import * as mongoose from 'mongoose';
import { ObjSIISASchema } from './../../../core/tm/schemas/siisa';

const numeracionMatriculasSchena = new mongoose.Schema({
    profesion: { type: ObjSIISASchema, required: false },
    especialidad: { type: ObjSIISASchema, required: false },
    proximoNumero: { type: Number, required: true }
});

const numeracionMatriculas = mongoose.model('numeracionMatriculas', numeracionMatriculasSchena, 'numeracionMatriculas');

export = numeracionMatriculas;
