import * as mongoose from 'mongoose';
import * as configPrivate from './../../../config.private';
import { Connections } from './../../../connections';

let pucoSchema = new mongoose.Schema({
    tipoDoc: String,
    dni: Number,
    codigoOS: Number,
    transmite: String,
    nombre: String,
    version: Date
});

pucoSchema.index({ 'dni': 1, 'version': 1 });
export let puco = Connections.puco.model(configPrivate.puco.database, pucoSchema, configPrivate.puco.database);

