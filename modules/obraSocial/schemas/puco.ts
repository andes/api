import * as mongoose from 'mongoose';
import * as configPrivate from './../../../config.private';
import { Connections } from './../../../connections';

const PucoSchema = new mongoose.Schema({
    tipoDoc: String,
    dni: Number,
    codigoOS: Number,
    transmite: String,
    nombre: String,
    version: Date
});

PucoSchema.index({ dni: 1, version: 1 });
PucoSchema.index({ version: 1 });
export let Puco = Connections.puco.model(configPrivate.puco.database, PucoSchema, configPrivate.puco.database);

