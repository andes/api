import * as mongoose from 'mongoose';
import * as configPrivate from './../../../config.private';
import { Connections } from './../../../connections';

const padronPrepagasSchema = new mongoose.Schema({
    dni: String,
    sexo: String,
    idObraSocial: Number,
    nombre: String,
    numeroAfiliado: String,
    idPrepaga: String
});

export const padronPrepagas: any = mongoose.model('padronPrepagas', padronPrepagasSchema, 'padronPrepagas');
