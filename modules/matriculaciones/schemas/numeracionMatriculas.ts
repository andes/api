import * as mongoose from 'mongoose';
import { ObjSIISASchema } from './../../../core/tm/schemas/siisa';

let numeracionMatriculasSchena = new mongoose.Schema({
    profesion: { type: ObjSIISASchema, required: false },
    especialidad: { type: ObjSIISASchema, required: false },
    proximoNumero: { type: Number, required: true }
});

let numeracionMatriculas = mongoose.model('numeracionMatriculas', numeracionMatriculasSchena, 'numeracionMatriculas');

export = numeracionMatriculas;
