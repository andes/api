import * as mongoose from 'mongoose';
import { ObjSIISASchema } from './../../../core/tm/schemas/siisa';

var numeracionMatriculasSchena = new mongoose.Schema({
    profesion: { type: ObjSIISASchema, required: true },
    proximoNumero: { type: Number, required: true }
});

var numeracionMatriculas = mongoose.model('numeracionMatriculas', numeracionMatriculasSchena, 'numeracionMatriculas');

export = numeracionMatriculas;
